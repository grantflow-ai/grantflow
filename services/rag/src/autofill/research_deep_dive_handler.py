from typing import Any, Final, Literal, TypedDict, cast

from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.sync import batched_gather
from packages.shared_utils.src.serialization import deserialize

from services.rag.src.autofill.constants import (
    MAX_RETRIEVAL_TOKENS,
    MIN_ANSWER_LENGTH,
    TEMPERATURE,
)
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries

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
    """Validate the answer response values (structure is already validated by deserialize)."""
    answer = response["answer"]
    if not isinstance(answer, str):
        raise ValidationError(
            f"Answer must be a string, got {type(answer).__name__}", context={"answer_type": type(answer).__name__}
        )

    answer = answer.strip()
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
        title = obj.get("title", f"Objective {i + 1}")
        description = obj.get("description", "")
        formatted.append(f"{i + 1}. {title}")
        if description:
            formatted.append(f"   {description}")

    return "\n".join(formatted)


async def _generate_field_answer(
    application: GrantApplication, field_name: ResearchDeepDiveKey, objectives_text: str, trace_id: str
) -> str:
    logger.debug(
        "Generating field answer",
        application_id=str(application.id),
        field_name=field_name,
        trace_id=trace_id,
    )
    prompt_with_title = RESEARCH_DEEP_DIVE_USER_PROMPT.substitute(
        application_title=application.title,
        objectives_text=objectives_text,
        question=RESEARCH_DEEP_DIVE_FIELD_MAPPING[field_name],
    )
    search_queries = await handle_create_search_queries(user_prompt=str(prompt_with_title))

    retrieval_results = await retrieve_documents(
        application_id=application.id,
        search_queries=search_queries,
        task_description=str(prompt_with_title),
        max_tokens=MAX_RETRIEVAL_TOKENS,
        trace_id=trace_id,
    )

    prompt = prompt_with_title.to_string(context="\n".join(retrieval_results))

    response: AnswerResponse = await handle_completions_request(
        prompt_identifier="research_deep_dive_generation",
        messages=prompt,
        system_prompt=RESEARCH_DEEP_DIVE_SYSTEM_PROMPT,
        response_schema=answer_response_schema,
        response_type=AnswerResponse,
        validator=_validate_answer_response,
        temperature=TEMPERATURE,
        trace_id=trace_id,
    )

    logger.debug(
        "Field answer generation completed",
        application_id=str(application.id),
        field_name=field_name,
        trace_id=trace_id,
    )

    return response["answer"].strip()


async def generate_research_deep_dive_content(application: GrantApplication, trace_id: str) -> ResearchDeepDive:
    logger.info(
        "Starting research deep dive generation",
        application_id=str(application.id),
        application_title=application.title,
        fields_to_generate=len(RESEARCH_DEEP_DIVE_FIELD_MAPPING),
        trace_id=trace_id,
    )

    objectives_text = _format_research_objectives(application.research_objectives or [])

    results = await batched_gather(
        *[
            _generate_field_answer(
                field_name=key, application=application, objectives_text=objectives_text, trace_id=trace_id
            )
            for key in RESEARCH_DEEP_DIVE_FIELD_MAPPING
        ],
        batch_size=4
    )

    logger.info(
        "Research deep dive generation completed successfully",
        application_id=str(application.id),
        fields_generated=len(results),
        trace_id=trace_id,
    )

    return cast("ResearchDeepDive", dict(zip(RESEARCH_DEEP_DIVE_FIELD_MAPPING, results, strict=True)))
