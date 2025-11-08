from typing import Final, Literal, TypedDict

from packages.db.src.json_objects import ResearchDeepDive, ResearchObjective
from packages.db.src.tables import GrantApplication
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import serialize

from services.rag.src.autofill.constants import MAX_RETRIEVAL_TOKENS, TEMPERATURE
from services.rag.src.utils.completion import handle_completions_request
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.search_queries import handle_create_search_queries

logger = get_logger(__name__)


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
You are a professional grant writer embedded in a system designed to produce best-in-class grant applications.
Your task is to generate detailed, well-structured answers to research questions based on the provided context,
research objectives, and uploaded research materials.

Operating rules:
1) First, read the entire prompt and all available data/context before writing.
2) Follow the established pipeline and output schema exactly.
3) Plan your approach step-by-step (use internal reasoning) before drafting to ensure accuracy, coherence, and maximal alignment with funder expectations.
4) Ensure that each answer directly addresses the research question, draws on the provided context and objectives, and maintains consistency with grant-writing standards.
5) Write in a professional academic tone, providing specific, evidence-based, and grant-appropriate details.

"""


class ResearchDeepDiveDraft(TypedDict):
    background_context: str
    hypothesis: str
    rationale: str
    novelty_and_innovation: str
    impact: str
    team_excellence: str
    research_feasibility: str
    preliminary_data: str


RESEARCH_DEEP_DIVE_DRAFT_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="research_deep_dive_draft",
    template="""
    ## Pipeline Instructions

    You are part of a system built to create best-in-class grant applications.
    Follow this reasoning pipeline carefully before generating draft answers:

    1. **Read** all input data - the application title, all research questions, research context, and stated research objectives.
    2. **Identify** key information for each question:
       - Determine the central focus of each research question.
       - Extract relevant evidence, concepts, and terminology from the research context and objectives.
       - Look carefully for names of people, institutions, previous works, publications, and technical terms.
       - Determine which references are most relevant for each answer.
    3. **Reason** about each answer:
       - Plan how each response will address its question clearly and directly.
       - Structure answers logically: background -> reasoning and evidence -> implications or conclusions.
       - Decide which identified examples, names, and terms will best demonstrate understanding.
       - Ensure factual consistency - do not invent or assume information beyond what is implied.
    4. **Write** draft answers using the same professional and academic tone as the input text.
       - Preserve the terminology, voice, and conceptual framing from the input.
       - Integrate names, works, and field-specific terms naturally.
       - Use examples and specific details to prove points and demonstrate understanding.
       - Maintain precision, coherence, and alignment with grant standards.

    ---

    ## Input Data

    ### Application Title
    ${application_title}

    ### Research Context
    ${context}

    ### Research Objectives
    ${objectives_text}

    ---

    ## Drafting Guidelines
    - Provide evidence-backed answers for every question.
    - Aim for 150-250 words per answer; concise but complete.
    - Note gaps if context lacks supporting evidence.
    - Use specific details, examples, and contextual references.
    - Maintain professional academic tone throughout.

    Return a JSON object with one string per question using the provided keys.
    """,
)


RESEARCH_DEEP_DIVE_REFINEMENT_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="research_deep_dive_refinement",
    template="""
    Refine the draft answers for the grant application titled "${application_title}".

    ## Draft Answers (JSON)
    ${draft}

    ## Research Objectives
    ${objectives_text}

    ## Research Context
    ${context}

    ## Refinement Tasks
    1. Validate accuracy, coherence, and tone for each answer.
    2. Expand or tighten content to reach 220-380 words per answer.
    3. Add specific data points, citations to context, or examples when available.
    4. Flag any missing evidence clearly within the answer.

    Return the refined answers as JSON using the same keys.
    """,
)


research_deep_dive_draft_schema = {
    "type": "object",
    "properties": {
        key: {
            "type": "string",
            "minLength": 200,
            "maxLength": 1200,
            "description": question,
        }
        for key, question in RESEARCH_DEEP_DIVE_FIELD_MAPPING.items()
    },
    "required": list(RESEARCH_DEEP_DIVE_FIELD_MAPPING.keys()),
}


research_deep_dive_refinement_schema = {
    "type": "object",
    "properties": {
        key: {
            "type": "string",
            "minLength": 400,
            "maxLength": 1800,
            "description": question,
        }
        for key, question in RESEARCH_DEEP_DIVE_FIELD_MAPPING.items()
    },
    "required": list(RESEARCH_DEEP_DIVE_FIELD_MAPPING.keys()),
}


def _validate_research_deep_dive_draft(response: ResearchDeepDiveDraft) -> None:
    for key in RESEARCH_DEEP_DIVE_FIELD_MAPPING:
        answer = response[key]
        word_count = len(answer.split())
        if word_count < 130:
            raise ValidationError(
                f"{key} draft too short: expected >=130 words",
                context={"field": key, "word_count": word_count, "preview": answer[:100]},
            )
        if word_count > 320:
            raise ValidationError(
                f"{key} draft too long: expected <=320 words",
                context={"field": key, "word_count": word_count, "preview": answer[:100]},
            )


def _validate_research_deep_dive_refined(response: ResearchDeepDive) -> None:
    for key in RESEARCH_DEEP_DIVE_FIELD_MAPPING:
        answer = getattr(response, key)
        if answer is None:
            answer = ""
        normalized = answer.strip()
        if not normalized:
            raise ValidationError(
                f"{key} answer empty after refinement",
                context={"field": key},
            )
        word_count = len(normalized.split())
        if word_count < 200 or word_count > 420:
            raise ValidationError(
                f"{key} answer should be 200-420 words",
                context={"field": key, "word_count": word_count, "preview": normalized[:120]},
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


async def _generate_research_deep_dive_draft(
    *,
    application: GrantApplication,
    compressed_context: str,
    objectives_text: str,
    trace_id: str,
) -> ResearchDeepDiveDraft:
    prompt = RESEARCH_DEEP_DIVE_DRAFT_PROMPT.to_string(
        application_title=application.title,
        context=compressed_context,
        objectives_text=objectives_text,
    )

    draft = await handle_completions_request(
        prompt_identifier="research_deep_dive_draft",
        messages=prompt,
        system_prompt=RESEARCH_DEEP_DIVE_SYSTEM_PROMPT,
        response_schema=research_deep_dive_draft_schema,
        response_type=ResearchDeepDiveDraft,
        validator=_validate_research_deep_dive_draft,
        temperature=TEMPERATURE,
        trace_id=trace_id,
    )

    logger.info(
        "Generated research deep dive draft answers",
        fields=len(draft),
        trace_id=trace_id,
    )

    return draft


async def _refine_research_deep_dive_answers(
    *,
    application: GrantApplication,
    compressed_context: str,
    objectives_text: str,
    draft: ResearchDeepDiveDraft,
    trace_id: str,
) -> ResearchDeepDive:
    prompt = RESEARCH_DEEP_DIVE_REFINEMENT_PROMPT.to_string(
        application_title=application.title,
        context=compressed_context,
        objectives_text=objectives_text,
        draft=serialize(draft).decode(),
    )

    refined = await handle_completions_request(
        prompt_identifier="research_deep_dive_refinement",
        messages=prompt,
        system_prompt=RESEARCH_DEEP_DIVE_SYSTEM_PROMPT,
        response_schema=research_deep_dive_refinement_schema,
        response_type=ResearchDeepDive,
        validator=_validate_research_deep_dive_refined,
        temperature=0.4,
        trace_id=trace_id,
    )

    logger.info(
        "Refined research deep dive answers",
        fields=len(RESEARCH_DEEP_DIVE_FIELD_MAPPING),
        trace_id=trace_id,
    )

    return refined


async def generate_research_deep_dive_content(application: GrantApplication, trace_id: str) -> ResearchDeepDive:
    objectives_text = _format_research_objectives(application.research_objectives or [])
    questions_list = "\n".join(
        f"{i + 1}. {question}" for i, question in enumerate(RESEARCH_DEEP_DIVE_FIELD_MAPPING.values())
    )
    comprehensive_prompt = (
        f'Answer the following research questions for a grant application titled: "{application.title}"\n\n'
        f"Research Questions:\n{questions_list}\n\nResearch Objectives:\n{objectives_text}"
    )

    logger.info("Generating shared search queries for all research deep dive fields", trace_id=trace_id)
    search_queries = await handle_create_search_queries(
        user_prompt=comprehensive_prompt, research_objectives=application.research_objectives or None
    )

    logger.info("Retrieving documents with shared context", trace_id=trace_id)
    shared_context = await retrieve_documents(
        application_id=str(application.id),
        search_queries=search_queries,
        task_description=comprehensive_prompt,
        max_tokens=MAX_RETRIEVAL_TOKENS,
        trace_id=trace_id,
    )
    shared_context_text = "\n".join(shared_context)

    compressed_context = compress_prompt_text(shared_context_text, aggressive=True)

    logger.debug(
        "Prepared shared context for deep dive generation",
        original_context_chars=len(shared_context_text),
        compressed_context_chars=len(compressed_context),
        trace_id=trace_id,
    )

    draft_answers = await _generate_research_deep_dive_draft(
        application=application,
        compressed_context=compressed_context,
        objectives_text=objectives_text,
        trace_id=trace_id,
    )

    refined_answers = await _refine_research_deep_dive_answers(
        application=application,
        compressed_context=compressed_context,
        objectives_text=objectives_text,
        draft=draft_answers,
        trace_id=trace_id,
    )

    return ResearchDeepDive(
        background_context=refined_answers.background_context.strip() if refined_answers.background_context else None,
        hypothesis=refined_answers.hypothesis.strip() if refined_answers.hypothesis else None,
        rationale=refined_answers.rationale.strip() if refined_answers.rationale else None,
        novelty_and_innovation=refined_answers.novelty_and_innovation.strip()
        if refined_answers.novelty_and_innovation
        else None,
        impact=refined_answers.impact.strip() if refined_answers.impact else None,
        team_excellence=refined_answers.team_excellence.strip() if refined_answers.team_excellence else None,
        research_feasibility=refined_answers.research_feasibility.strip()
        if refined_answers.research_feasibility
        else None,
        preliminary_data=refined_answers.preliminary_data.strip() if refined_answers.preliminary_data else None,
        scientific_infrastructure=refined_answers.scientific_infrastructure.strip()
        if refined_answers.scientific_infrastructure
        else None,
    )
