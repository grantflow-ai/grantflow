from typing import Final, Literal, TypedDict, cast

from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.sync import batched_gather

from services.rag.src.autofill.constants import (
    MAX_RETRIEVAL_TOKENS,
    MIN_ANSWER_LENGTH,
    TEMPERATURE,
)
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries

RESEARCH_FIELD_BATCH_SIZE: Final[int] = 4

logger = get_logger(__name__)


class AnswerResponse(TypedDict):
    answer: str


ResearchDeepDiveKey = Literal[
    "background_context",
    "hypothesis",
    "rationale",
    "novelty_and_innovation",
    "impact",
    "team_excellence",
    "research_feasibility",
    "preliminary_data",
]

RESEARCH_DEEP_DIVE_FIELD_MAPPING: Final[dict[ResearchDeepDiveKey, str]] = {
    "background_context": "What is the context and background of your research?",
    "hypothesis": "What is the central hypothesis or key question your research aims to address?",
    "rationale": "Why is this research important and what motivates its pursuit?",
    "novelty_and_innovation": "What makes your approach unique or innovative compared to existing research?",
    "impact": "How will your research contribute to the field and society?",
    "team_excellence": "What makes your team uniquely qualified to carry out this project?",
    "research_feasibility": "What makes your research plan realistic and achievable?",
    "preliminary_data": "Have you obtained any preliminary findings that support your research?",
}

RESEARCH_DEEP_DIVE_SYSTEM_PROMPT: Final[str] = """
You are a specialist in writing comprehensive research answers for grant applications. Your task is to generate
detailed, well-structured answers to research questions based on the provided context and research materials.
"""


RESEARCH_DEEP_DIVE_USER_PROMPT = PromptTemplate(
    name="research_deep_dive_generation",
    template="""
    Answer the following question for a grant application titled: "${application_title}"
    Based on the research context below.

    ## Question
    ${question}

    ## Research Context
    ${context}

    ## Research Objectives
    ${objectives_text}

    ## Content Requirements
    Provide a comprehensive, well-structured answer that:
        1. Directly addresses the question
        2. Uses insights from the research context
        3. Aligns with the stated research objectives
        4. Is appropriate for a grant application
        5. Is 200-500 words in length
        6. Uses professional academic tone
        7. Includes specific details and examples where relevant
    """,
)

answer_response_schema = {
    "type": "object",
    "properties": {
        "answer": {
            "type": "string",
            "minLength": 200,
            "maxLength": 2000,
            "description": "Comprehensive answer to the research question (200-500 words)",
        },
    },
    "required": ["answer"],
}


def _validate_answer_response(response: AnswerResponse) -> None:
    answer = response["answer"].strip()
    if len(answer) < MIN_ANSWER_LENGTH:
        raise ValidationError(
            f"Answer too short: {len(answer)} characters (min: {MIN_ANSWER_LENGTH})",
            context={"length": len(answer), "min_length": MIN_ANSWER_LENGTH, "content_preview": answer[:100]},
        )

    word_count = len(answer.split())
    if word_count < 150:
        raise ValidationError(
            f"Answer has too few words: {word_count} (target: 200-500)",
            context={"word_count": word_count, "target_range": "200-500", "content_preview": answer[:100]},
        )

    if word_count > 600:
        raise ValidationError(
            f"Answer has too many words: {word_count} (target: 200-500)",
            context={"word_count": word_count, "target_range": "200-500", "content_preview": answer[:100]},
        )


def _format_research_objectives(objectives: list[ResearchObjective]) -> str:
    formatted = []
    for i, obj in enumerate(objectives):
        title = obj["title"]
        description = obj.get("description", "")
        formatted.append(f"{i + 1}. {title}")
        if description:
            formatted.append(f"   {description}")

    return "\n".join(formatted)


async def _generate_field_answer(
    application: GrantApplication, field_name: ResearchDeepDiveKey, objectives_text: str, trace_id: str
) -> str:
    prompt_with_title = RESEARCH_DEEP_DIVE_USER_PROMPT.substitute(
        application_title=application.title,
        objectives_text=objectives_text,
        question=RESEARCH_DEEP_DIVE_FIELD_MAPPING[field_name],
    )
    search_queries = await handle_create_search_queries(user_prompt=str(prompt_with_title))

    retrieval_results = await retrieve_documents(
        application_id=str(application.id),
        search_queries=search_queries,
        task_description=str(prompt_with_title),
        max_tokens=MAX_RETRIEVAL_TOKENS,
        trace_id=trace_id,
    )

    full_prompt = prompt_with_title.to_string(context="\n".join(retrieval_results))
    compressed_prompt = compress_prompt_text(full_prompt, aggressive=True)

    response: AnswerResponse = await handle_completions_request(
        prompt_identifier="research_deep_dive_generation",
        messages=compressed_prompt,
        system_prompt=RESEARCH_DEEP_DIVE_SYSTEM_PROMPT,
        response_schema=answer_response_schema,
        response_type=AnswerResponse,
        validator=_validate_answer_response,
        temperature=TEMPERATURE,
        trace_id=trace_id,
    )

    return response["answer"].strip()


async def _generate_field_answer_with_context(
    field_name: ResearchDeepDiveKey,
    application: GrantApplication,
    objectives_text: str,
    shared_context: str,
    trace_id: str,
) -> str:
    prompt_with_title = RESEARCH_DEEP_DIVE_USER_PROMPT.substitute(
        application_title=application.title,
        objectives_text=objectives_text,
        question=RESEARCH_DEEP_DIVE_FIELD_MAPPING[field_name],
    )

    full_prompt = prompt_with_title.to_string(context=shared_context)
    compressed_prompt = compress_prompt_text(full_prompt, aggressive=True)

    response: AnswerResponse = await handle_completions_request(
        prompt_identifier="research_deep_dive_generation",
        messages=compressed_prompt,
        system_prompt=RESEARCH_DEEP_DIVE_SYSTEM_PROMPT,
        response_schema=answer_response_schema,
        response_type=AnswerResponse,
        validator=_validate_answer_response,
        temperature=TEMPERATURE,
        trace_id=trace_id,
    )

    return response["answer"].strip()


async def generate_research_deep_dive_content(application: GrantApplication, trace_id: str) -> ResearchDeepDive:
    objectives_text = _format_research_objectives(application.research_objectives or [])

    # Generate comprehensive search queries once for all fields
    all_questions = list(RESEARCH_DEEP_DIVE_FIELD_MAPPING.values())
    comprehensive_prompt = f"""
    Answer the following research questions for a grant application titled: "{application.title}"

    Research Questions:
    {chr(10).join(f"{i + 1}. {q}" for i, q in enumerate(all_questions))}

    Research Objectives:
    {objectives_text}
    """

    logger.info("Generating shared search queries for all research deep dive fields", trace_id=trace_id)
    search_queries = await handle_create_search_queries(user_prompt=comprehensive_prompt)

    logger.info("Retrieving documents with shared context", trace_id=trace_id)
    shared_context = await retrieve_documents(
        application_id=str(application.id),
        search_queries=search_queries,
        task_description=comprehensive_prompt,
        max_tokens=MAX_RETRIEVAL_TOKENS,
        trace_id=trace_id,
    )
    shared_context_text = "\n".join(shared_context)

    field_names = list(RESEARCH_DEEP_DIVE_FIELD_MAPPING.keys())

    # Generate each field with shared context
    results = await batched_gather(
        *[
            _generate_field_answer_with_context(
                field_name=key,
                application=application,
                objectives_text=objectives_text,
                shared_context=shared_context_text,
                trace_id=trace_id,
            )
            for key in field_names
        ],
        batch_size=RESEARCH_FIELD_BATCH_SIZE,
        return_exceptions=True,
    )

    field_values = {}
    failed_fields = []

    for field_name, result in zip(field_names, results, strict=True):
        if isinstance(result, Exception):
            logger.warning(
                "Research deep dive field generation failed",
                field_name=field_name,
                error=str(result),
                trace_id=trace_id,
            )
            field_values[field_name] = f"[Failed to generate {field_name}. Manual completion required.]"
            failed_fields.append(field_name)
        else:
            field_values[field_name] = cast("str", result)

    if failed_fields:
        logger.warning(
            "Some research deep dive fields failed",
            total_fields=len(field_names),
            successful_fields=len(field_names) - len(failed_fields),
            failed_fields=failed_fields,
            trace_id=trace_id,
        )

    return cast("ResearchDeepDive", ResearchDeepDive(**field_values))  # type: ignore[typeddict-item]
