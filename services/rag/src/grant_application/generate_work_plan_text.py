import math
import re
from typing import TYPE_CHECKING, Any, Final, cast

from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive
from packages.shared_utils.src.ai import GENERATION_MODEL
from packages.shared_utils.src.exceptions import EvaluationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.sync import batched_gather

from services.rag.src.dto import ResearchComponentGenerationDTO
from services.rag.src.evaluation_criteria import get_evaluation_kwargs
from services.rag.src.utils.evaluation import with_evaluation
from services.rag.src.utils.lengths import compute_word_bounds
from services.rag.src.utils.long_form import generate_long_form_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.source_validation import handle_source_validation

if TYPE_CHECKING:
    from services.rag.src.grant_application.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)

MAX_SHARED_QUERIES: Final[int] = 15
MAX_SHARED_TOKENS: Final[int] = 12000
DEFAULT_BATCH_SIZE: Final[int] = 5
COMPONENT_TIMEOUT: Final[float] = 480.0
LENGTH_TOLERANCE_RATIO: Final[float] = 0.05
MAX_LENGTH_ADJUST_ATTEMPTS: Final[int] = 2
DEFAULT_OBJECTIVE_MAX_WORDS: Final[int] = 700
DEFAULT_TASK_MAX_WORDS: Final[int] = 400

TASK_CONTENT_GUIDELINES: Final[str] = """For this task:
- Be specific about the methodologies, protocols, and techniques that will be used
- Include concrete steps for implementation
- Clarify dependencies on other tasks where applicable
- Explain expected outcomes and deliverables
- Consider potential challenges and contingency plans
"""

TASK_RELATIONSHIP_GUIDELINES: Final[str] = """When addressing relationships between tasks:
- Make explicit connections to prerequisite tasks
- Explain how this task builds upon outputs from other tasks
- Clarify how results from this task will feed into subsequent tasks
- Maintain clear timeline dependencies
- Ensure methodological consistency across related tasks
"""

OBJECTIVE_CONTENT_GUIDELINES: Final[str] = """For this research objective:
- Articulate the overarching scientific goal and its significance
- Provide a high-level strategy for achievement
- Explain how this objective advances knowledge in your field
- Outline how the constituent tasks collectively address this objective
- Highlight the expected scientific impact
"""

OBJECTIVE_RELATIONSHIP_GUIDELINES: Final[str] = """When addressing relationships between objectives:
- Explain how this objective complements other research objectives
- Highlight synergies between objectives that enhance overall scientific impact
- Maintain conceptual alignment with the broader research goals
- Ensure your objective creates a coherent narrative with other research aims
"""

GENERATE_WORK_COMPONENT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="work_component_generation",
    template="""
Your task is to write the text for a ${object_type} in a grant application work plan.

An ${object_type} is ${object_type_description}. This component must be scientifically accurate, methodologically sound, and demonstrate a clear scientific contribution to the field.
The text will be evaluated by scientific experts and must balance technical precision with clarity.

---

## Operating Pipeline

Follow this structured reasoning process before and during writing:

1. **Read**
   - Carefully read *all* provided materials: the description, relationships, instructions, guiding questions, and prior work plan text.
   - Do not assume missing information until everything has been reviewed.

2. **Identify**
   - Identify the main research focus, technical goals, and dependencies.
   - Recognize relevant methods, terms, names of researchers, datasets, and related works already mentioned in the context.
   - Mark only *truly* missing data-do not fabricate details.

3. **Reason**
   - Reason through how this ${object_type} connects to other components and the overall research plan.
   - Determine the scientific logic, contribution, and sequence of activities based on the information you have.
   - When data is missing, explicitly mention it using precise reasoning about what's absent and why it matters.

4. **Write**
   - Write with precision and structure.
   - Integrate available examples, references, and terminology naturally.
   - Keep tone professional, scientific, and aligned with the original context and terminology.
   - Examples, names, and technical details strengthen credibility-use them when relevant.

---

## Component Context

The title of this ${object_type} is ${object_title}, and the user provided the following description for it:

<description>
${description}
</description>

## Generation Instructions

Adhere to these instructions to generate the text:
<instructions>
${instructions}
</instructions>

## Relationships

These are the relationships this ${object_type} has with other components:
<relationships>
${relationships}
</relationships>

${relationship_guidance}

Use these relationships to ensure the generated text is consistent with the broader context and prior sections.

## Content Guidance

${object_type_specific_guidance}

The generated text should address (implicitly) the following guiding questions:
<guiding_questions>
${guiding_questions}
</guiding_questions>

Use the already written parts of the work plan to maintain continuity and coherence:
<work_plan_text>
${work_plan_text}
</work_plan_text>

""",
)

ADJUST_WORK_COMPONENT_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="adjust_work_component_length",
    template="""
Your task is to ${direction} the following ${object_type} text to meet the required word count.

- **Minimum words**: ${min_words}
- **Maximum words**: ${max_words}

You must preserve scientific accuracy, structure, and coherence.

Component number: ${component_number}
Title: ${component_title}

Instructions:
<instructions>
${instructions}
</instructions>

Guiding questions:
<guiding_questions>
${guiding_questions}
</guiding_questions>

Relationships:
<relationships>
${relationships}
</relationships>

Work Plan So Far:
<work_plan_so_far>
${work_plan_so_far}
</work_plan_so_far>

Draft text:
<draft_text>
${draft_text}
</draft_text>

Adjust and return the improved text only.
""",
)


def _word_count(text: str) -> int:
    return len(text.split())


def _component_word_bounds(component: ResearchComponentGenerationDTO) -> tuple[int, int]:
    default_max = DEFAULT_OBJECTIVE_MAX_WORDS if component["type"] == "objective" else DEFAULT_TASK_MAX_WORDS
    return compute_word_bounds(component.get("length_constraint"), default_max_words=default_max)


def _within_length_bounds(*, word_count: int, min_words: int, max_words: int) -> bool:
    tolerance = max(5, math.ceil(max_words * LENGTH_TOLERANCE_RATIO))
    upper_limit = max_words + tolerance
    return min_words <= word_count <= upper_limit


def _truncate_to_word_limit(text: str, max_words: int) -> str:
    if max_words <= 0:
        return ""

    tokens = re.findall(r"\S+\s*", text)
    truncated_tokens: list[str] = []
    words_accumulated = 0

    for token in tokens:
        token_words = token.strip().split()
        if not token_words:
            truncated_tokens.append(token)
            continue

        if words_accumulated + len(token_words) <= max_words:
            truncated_tokens.append(token)
            words_accumulated += len(token_words)
            continue

        remaining = max_words - words_accumulated
        if remaining <= 0:
            break

        partial_words = token_words[:remaining]
        suffix = " " if token.endswith(" ") else ""
        truncated_tokens.append(" ".join(partial_words) + suffix)
        break

    return "".join(truncated_tokens).rstrip()


def _format_relationships(component: ResearchComponentGenerationDTO) -> str:
    relationships = component.get("relationships", [])
    if not relationships:
        return "None"
    return "\n".join(f"- {component['number']} -> {target}: {description}" for target, description in relationships)


async def adjust_component_length(
    *,
    component: ResearchComponentGenerationDTO,
    component_text: str,
    rag_results: list[str],
    form_inputs: ResearchDeepDive,
    work_plan_text: str,
    trace_id: str,
    job_manager: "JobManager[StageDTO]",
) -> str:
    min_words, max_words = _component_word_bounds(component)
    component_section = cast(
        "GrantLongFormSection",
        {
            "id": component["number"],
            "order": 0,
            "title": component["title"],
            "evidence": "",
            "parent_id": None,
            "depends_on": [],
            "generation_instructions": component["instructions"],
            "is_clinical_trial": False,
            "is_detailed_research_plan": component["type"] == "objective",
            "keywords": [],
            "search_queries": component.get("search_queries", []),
            "topics": [],
            "length_constraint": component.get("length_constraint"),
        },
    )

    word_count = _word_count(component_text)

    if _within_length_bounds(word_count=word_count, min_words=min_words, max_words=max_words):
        return component_text

    direction = "compress to meet the limit" if word_count > max_words else "expand to meet the minimum"
    adjusted_text = component_text

    for _attempt in range(MAX_LENGTH_ADJUST_ATTEMPTS):
        await job_manager.ensure_not_cancelled()

        adjust_prompt = ADJUST_WORK_COMPONENT_PROMPT.to_string(
            object_type=component["type"],
            component_number=component["number"],
            component_title=component["title"],
            direction=direction,
            max_words=max_words,
            min_words=min_words,
            instructions=component["instructions"],
            guiding_questions="\n".join(component.get("guiding_questions", [])) or "None",
            relationships=_format_relationships(component),
            draft_text=adjusted_text,
            work_plan_so_far=work_plan_text or "None",
        )

        adjusted_text = await with_evaluation(
            prompt_identifier="adjust_work_component_length",
            prompt_handler=handle_work_plan_component_generation,
            prompt=adjust_prompt,
            max_words=max_words,
            min_words=min_words,
            rag_results=rag_results,
            user_input=form_inputs,
            trace_id=trace_id,
            **get_evaluation_kwargs(
                "generate_work_plan",
                job_manager,
                section_config=component_section,
                rag_context=rag_results,
                research_objectives=form_inputs.get("research_objectives"),
            ),
        )

        word_count = _word_count(adjusted_text)
        if _within_length_bounds(word_count=word_count, min_words=min_words, max_words=max_words):
            return adjusted_text

    if word_count > max_words:
        truncated_text = _truncate_to_word_limit(adjusted_text, max_words)

        async def _return_truncated(_prompt: str, **_kwargs: Any) -> str:
            return truncated_text

        final_prompt = ADJUST_WORK_COMPONENT_PROMPT.to_string(
            object_type=component["type"],
            component_number=component["number"],
            component_title=component["title"],
            direction="finalize within limits",
            max_words=max_words,
            min_words=min_words,
            instructions=component["instructions"],
            guiding_questions="\n".join(component.get("guiding_questions", [])) or "None",
            relationships=_format_relationships(component),
            draft_text=truncated_text,
            work_plan_so_far=work_plan_text or "None",
        )

        return await with_evaluation(
            prompt_identifier="adjust_work_component_length_truncate",
            prompt_handler=_return_truncated,
            prompt=final_prompt,
            max_words=max_words,
            min_words=min_words,
            rag_results=rag_results,
            user_input=form_inputs,
            trace_id=trace_id,
            **get_evaluation_kwargs(
                "generate_work_plan",
                job_manager,
                section_config=component_section,
                rag_context=rag_results,
                research_objectives=form_inputs.get("research_objectives"),
            ),
        )

    return adjusted_text


async def handle_work_plan_component_generation(
    prompt: str,
    *,
    min_words: int,
    max_words: int,
    timeout: float = COMPONENT_TIMEOUT,
    **kwargs: Any,
) -> str:
    return await generate_long_form_text(
        max_words=max_words,
        min_words=min_words,
        prompt_identifier="generate_work_component",
        task_description=prompt,
        model=GENERATION_MODEL,
        timeout=timeout,
        **kwargs,
    )


async def generate_work_plan_component_text(
    *,
    application_id: str,
    component: ResearchComponentGenerationDTO,
    form_inputs: ResearchDeepDive,
    work_plan_text: str,
    shared_rag_results: list[str] | None = None,
    trace_id: str,
    job_manager: "JobManager[StageDTO]",
) -> str:
    object_type_specific_guidance = (
        TASK_CONTENT_GUIDELINES if component["type"] == "task" else OBJECTIVE_CONTENT_GUIDELINES
    )
    relationship_guidance = (
        TASK_RELATIONSHIP_GUIDELINES if component["type"] == "task" else OBJECTIVE_RELATIONSHIP_GUIDELINES
    )

    min_words, max_words = _component_word_bounds(component)

    prompt = GENERATE_WORK_COMPONENT_USER_PROMPT.to_string(
        description=component.get("description", "none given"),
        guiding_questions=component["guiding_questions"],
        instructions=component["instructions"],
        relationships=component["relationships"],
        work_plan_text=work_plan_text,
        object_type=component["type"],
        object_type_description="a concrete research task that is a part of a larger specific research objective"
        if component["type"] == "task"
        else "a specific research goal or aim",
        object_type_specific_guidance=object_type_specific_guidance,
        relationship_guidance=relationship_guidance,
        object_title=component["title"],
    )

    rag_results = []

    if shared_rag_results is not None:
        rag_results.extend(shared_rag_results[:5])

    if component["search_queries"]:
        try:
            component_specific_results = await retrieve_documents(
                application_id=application_id,
                task_description=prompt,
                search_queries=component["search_queries"][:3],
                form_inputs=form_inputs,
                section_title=component["title"],
                with_guided_retrieval=True,
                max_tokens=3000,
                trace_id=trace_id,
            )
            rag_results.extend(component_specific_results)
        except Exception as e:
            logger.debug(
                "Component-specific retrieval failed, using shared context only",
                component=component["number"],
                error=str(e),
                trace_id=trace_id,
            )

    if not rag_results and shared_rag_results:
        rag_results = shared_rag_results
    elif not rag_results:
        rag_results = ["No relevant context found. Generate based on instructions and requirements."]

    if source_validation_error := await handle_source_validation(
        task_description=str(prompt),
        sources={"rag_results": rag_results, "form_inputs": form_inputs},
        max_length=max_words,
        trace_id=trace_id,
    ):
        return source_validation_error

    try:
        component_text = await with_evaluation(
            max_words=max_words,
            min_words=min_words,
            prompt=prompt,
            prompt_handler=handle_work_plan_component_generation,
            prompt_identifier="generate_work_component",
            rag_results=rag_results,
            user_input=form_inputs,
            trace_id=trace_id,
            **get_evaluation_kwargs(
                "generate_work_plan",
                job_manager,
                section_config=None,
                rag_context=rag_results,
                research_objectives=form_inputs.get("research_objectives"),
            ),
        )
        if component_text and isinstance(component_text, str) and not component_text.lstrip().startswith("["):
            component_text = await adjust_component_length(
                component=component,
                component_text=component_text,
                rag_results=rag_results,
                form_inputs=form_inputs,
                work_plan_text=work_plan_text,
                trace_id=trace_id,
                job_manager=job_manager,
            )
        return component_text
    except EvaluationError as e:
        logger.warning(
            "Component failed evaluation",
            component_number=component["number"],
            component_title=component["title"],
            error=str(e),
            trace_id=trace_id,
        )
        return f"[Failed quality evaluation for {component['title']}. Manual review required.]"
    except TimeoutError:
        logger.warning(
            "Component generation timed out",
            component_number=component["number"],
            component_title=component["title"],
            trace_id=trace_id,
        )
        return f"[Generation timed out for {component['title']}. Consider simplifying requirements.]"
    except Exception as e:
        logger.error(
            "Unexpected error in component generation",
            component_number=component["number"],
            component_title=component["title"],
            error=str(e),
            trace_id=trace_id,
        )
        return f"[Unexpected error generating {component['title']}.]"


async def generate_workplan_section(
    *,
    application_id: str,
    form_inputs: ResearchDeepDive,
    components: list[ResearchComponentGenerationDTO],
    trace_id: str,
    job_manager: "JobManager[StageDTO]",
    batch_size: int = DEFAULT_BATCH_SIZE,
    retrieve_shared_context: bool = True,
) -> str:
    await job_manager.ensure_not_cancelled()

    shared_rag_results: list[str] = []
    if retrieve_shared_context:
        all_search_queries = []
        for component in components:
            all_search_queries.extend(component["search_queries"])

        unique_queries = list(dict.fromkeys(all_search_queries))[:MAX_SHARED_QUERIES]

        if unique_queries:
            logger.info(
                "Retrieving shared RAG context",
                query_count=len(unique_queries),
                component_count=len(components),
                trace_id=trace_id,
            )

            try:
                shared_rag_results = await retrieve_documents(
                    application_id=application_id,
                    search_queries=unique_queries,
                    task_description="Generate comprehensive research work plan with objectives and tasks",
                    max_tokens=MAX_SHARED_TOKENS,
                    trace_id=trace_id,
                )
            except Exception as e:
                logger.warning(
                    "Failed to retrieve shared RAG context, continuing without it",
                    error=str(e),
                    trace_id=trace_id,
                )

    generation_tasks = [
        generate_work_plan_component_text(
            application_id=application_id,
            component=component,
            work_plan_text="",
            form_inputs=form_inputs,
            shared_rag_results=shared_rag_results if retrieve_shared_context else None,
            trace_id=trace_id,
            job_manager=job_manager,
        )
        for component in components
    ]

    logger.info(
        "Starting parallel component generation",
        total_components=len(components),
        batch_size=batch_size,
        trace_id=trace_id,
    )

    all_texts = await batched_gather(*generation_tasks, batch_size=batch_size, return_exceptions=True)

    await job_manager.ensure_not_cancelled()

    text_parts: list[str] = []
    successful_count = 0
    failed_components = []

    for component, result in zip(components, all_texts, strict=True):
        if len(text_parts) % 10 == 0:
            await job_manager.ensure_not_cancelled()

        component_text: str

        if isinstance(result, Exception):
            error_type = type(result).__name__
            logger.error(
                "Component generation failed",
                component_number=component["number"],
                component_title=component["title"],
                error_type=error_type,
                error=str(result),
                trace_id=trace_id,
            )

            if isinstance(result, EvaluationError):
                component_text = f"[Failed quality evaluation for {component['title']}. Manual review required.]"
            elif isinstance(result, TimeoutError):
                component_text = f"[Generation timed out for {component['title']}. Consider simplifying requirements.]"
            else:
                component_text = f"[Error generating {component['title']}: {error_type}]"

            failed_components.append(
                {
                    "number": component["number"],
                    "title": component["title"],
                    "error_type": error_type,
                }
            )
        else:
            component_text = cast("str", result)
            successful_count += 1

        if "." not in component["number"]:
            text_parts.append(f"### Objective {component['number']}: {component['title']}\n{component_text}")
        else:
            text_parts.append(f"#### {component['number']}: {component['title']}\n{component_text}")

    work_plan_text = "\n\n".join(text_parts) if text_parts else ""

    logger.info(
        "Work plan generation complete",
        total_components=len(components),
        successful=successful_count,
        failed=len(failed_components),
        failed_components=failed_components,
        total_words=len(work_plan_text.split()),
        trace_id=trace_id,
    )

    return work_plan_text.strip()
