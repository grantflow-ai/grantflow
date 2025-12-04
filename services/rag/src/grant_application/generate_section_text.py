from functools import partial
from typing import TYPE_CHECKING, Final

from packages.db.src.json_objects import (
    CFPAnalysis,
    GrantLongFormSection,
    ResearchDeepDive,
    TranslationalResearchDeepDive,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.serialization import serialize

from services.rag.src.constants import MIN_WORDS_RATIO
from services.rag.src.evaluation_criteria import get_evaluation_kwargs
from services.rag.src.utils.evaluation import with_evaluation
from services.rag.src.utils.lengths import compute_word_bounds, constraint_to_word_limit
from services.rag.src.utils.long_form import generate_long_form_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.source_validation import handle_source_validation
from services.rag.src.utils.text_compression import compress_text

if TYPE_CHECKING:
    from packages.db.src.json_objects import ScientificAnalysisResult

    from services.rag.src.grant_application.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)


def _format_cfp_requirements_for_section(section: GrantLongFormSection) -> str:
    cfp_text = ""

    if definition := section.get("definition"):
        cfp_text += f"## Section Definition\n\n{definition}\n\n"

    if requirements := section.get("requirements"):
        cfp_text += "## CFP Requirements\n\n"
        for req in requirements:
            cfp_text += f"- **{req['requirement']}**\n"
            cfp_text += f'  > *CFP Quote: "{req["quote_from_source"]}"*\n'
            cfp_text += f"  > *Category: {req['category']}*\n\n"

    if length_constraint := section.get("length_constraint"):
        cfp_text += "## Length Requirements\n\n"
        if length_constraint["type"] == "characters":
            cfp_text += f"- **Character Limit:** {length_constraint['value']} characters\n"
            approx_words = constraint_to_word_limit(length_constraint)
            if approx_words:
                cfp_text += f"  > Approx. {approx_words} words\n"
        else:
            cfp_text += f"- **Word Limit:** {length_constraint['value']} words\n"

        if source := length_constraint.get("source"):
            cfp_text += f"  > *Source: {source}*\n"
        cfp_text += "\n"

    if evidence := section.get("evidence"):
        cfp_text += f"## CFP Source Reference\n\n{evidence}\n\n"

    return cfp_text


def _fallback_length_bounds(section: GrantLongFormSection) -> tuple[int, int]:
    section_title_lower = section["title"].lower()

    if "abstract" in section_title_lower:
        return (250, 500)
    if "research strategy" in section_title_lower or "approach" in section_title_lower:
        return (800, 1200)
    if "preliminary" in section_title_lower or "pilot" in section_title_lower:
        return (600, 900)
    if "aims" in section_title_lower or "objectives" in section_title_lower:
        return (400, 700)
    if "background" in section_title_lower or "significance" in section_title_lower:
        return (700, 1000)
    if "methods" in section_title_lower or "methodology" in section_title_lower:
        return (600, 1000)
    if "timeline" in section_title_lower or "plan" in section_title_lower:
        return (400, 600)
    return (600, 1000)


def _get_section_length_requirements(section: GrantLongFormSection) -> str:
    if length_constraint := section.get("length_constraint"):
        min_words, max_words = compute_word_bounds(length_constraint)
        if length_constraint["type"] == "characters":
            return f"Target length: {min_words}-{max_words} words (~{length_constraint['value']} characters from CFP)"
        source = length_constraint.get("source") or "CFP-specified"
        return f"Target length: {min_words}-{max_words} words ({source})"

    min_words, max_words = _fallback_length_bounds(section)
    return f"Target length: {min_words}-{max_words} words for comprehensive section coverage"


SECTION_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_generation",
    template="""
    You are a professional grant writer and scientific editor embedded in a system designed to produce high-quality, funder-compliant research sections.

    Your role is to read, reason, and write the **${section_title}** section for a grant application using the information below.

    ---

    ## Reasoning Pipeline

    ### 1. **Read**
    Carefully read and understand all provided materials:
    - CFP requirements, section definition, and length constraints
    - Research objectives and their contexts
    - Relationships between objectives and tasks
    - Scientific literature and RAG context
    - Research plan and prior sections
    - Keywords and topics

    > Your task is to internalize this information before writing. Do not skip or summarize at this stage-read to comprehend purpose, scope, and expectations.

    ---

    ### 2. **Identify**
    Identify the following from your reading:
    - The **scientific focus** and purpose of this section (what question or challenge it addresses).
    - The **key requirements** and constraints from the CFP text.
    - The **most relevant objectives, methods, and results** that this section must connect to.
    - Which specific **research goals and tasks** from the work plan are directly applicable to this section's scope.
    - Critical **examples, evidence, or researcher names** mentioned in the scientific literature-use them to substantiate how the research can accomplish the identified goals.
    - Any **missing but logically implied links** between objectives or methods.

    Record mentally how each of these supports the section's purpose and evaluation criteria.

    ---

    ### 3. **Reason**
    Before writing, plan how to structure your section:
    - Decide what the introduction, core argument, and conclusion will cover.
    - Connect CFP requirements to the scientific rationale, showing how the section fulfills them.
    - Ensure alignment with the Research Plan (e.g., references like *"as described in Objective 2, Task 2.3"*).
    - Determine which research goals and tasks are directly relevant to this section's purpose. Plan to incorporate them only where they strengthen the scientific argument.
    - Integrate retrieved scientific data and terminology naturally. Use the evidence to show that the proposed objectives are achievable and well-grounded.
    - Use concrete examples, results, and methodological details-these are the best proof of credibility.
    - Ensure that the section is coherent, realistic, and measurable.

    ---

    ### 4. **Write**
    Write the full section text following these principles:
    - **Clarity & Structure**: Use markdown (## for main headings, ### for subsections).
    - **Depth**: Include specific hypotheses, methods, data sources, expected outcomes, and challenges.
    - **Integration**: Quote or paraphrase scientific evidence from the context.
    - **Consistency**: Align with the Research Plan and objectives without contradictions.
    - **Goals & Tasks**: When relevant to the section, reference specific research objectives or tasks from the work plan. Adapt the language to fit naturally within the academic tone, and cite details only when supported by the scientific literature context. Demonstrate how the proposed research, grounded in the provided evidence, can feasibly achieve the stated goals.
    - **Style**: Maintain academic tone, precise terminology, and professional flow.
    - **Length**: Stay within ${length_requirements}.

    ---

    ## Input Materials

    ### Section Instructions
    ${instructions}

    ### Focus Areas
    ${keywords}

    ### Key Topics
    ${topics}

    ### CFP Definition and Requirements
    ${cfp_requirements}

    ---

    ## Research Materials

    ### Scientific Literature Context
    ${context}

    ### Research Plan
    ${research_plan_context}

    ${scientific_analysis_section}

    ---

    ### Output Requirements
    - Deliver a **fully written section** ready for submission.
    - Do **not** include notes, reflections, or internal reasoning-only the final polished text.
    - Ensure the text is self-contained, logically ordered, and persuasive.
""",
)


async def generate_section_text(task_description: str, *, trace_id: str, min_words: int, max_words: int) -> str:
    return await generate_long_form_text(
        task_description=task_description,
        max_words=max_words,
        min_words=min_words,
        prompt_identifier="section_generation",
        trace_id=trace_id,
    )


async def handle_generate_section_text(
    section: GrantLongFormSection,
    form_inputs: ResearchDeepDive | TranslationalResearchDeepDive | None,
    shared_context: str,
    cfp_analysis: CFPAnalysis,
    research_plan_text: str,
    trace_id: str,
    job_manager: "JobManager[StageDTO]",
    scientific_analysis: "ScientificAnalysisResult | None" = None,
) -> str:
    length_constraint = section.get("length_constraint")
    if length_constraint is not None:
        min_words, max_words = compute_word_bounds(length_constraint)
    else:
        min_words, max_words = _fallback_length_bounds(section)

    section_title = section["title"]

    logger.debug(
        "Starting section text generation",
        section_id=section["id"],
        section_title=section_title,
        max_words=max_words,
        shared_context_chars=len(shared_context),
        trace_id=trace_id,
    )

    task_description = f"Generate the {section_title} section. Instructions: {section['generation_instructions']}"
    validation_error = await handle_source_validation(
        task_description=task_description,
        max_length=max_words,
        minimum_percentage=MIN_WORDS_RATIO * 100,
        retrieval_context=shared_context,
        research_plan_text=research_plan_text,
        trace_id=trace_id,
    )
    if validation_error:
        logger.warning(
            "Source validation identified missing information, proceeding with available context",
            section=section_title,
            missing_info=validation_error,
            trace_id=trace_id,
        )

    cfp_requirements_text = _format_cfp_requirements_for_section(section)
    length_requirements = _get_section_length_requirements(section)

    compressed_research_plan = compress_text(research_plan_text)
    logger.debug(
        "Prepared and compressed context for section generation",
        section_id=section["id"],
        section_title=section_title,
        original_research_plan_chars=len(research_plan_text),
        compressed_research_plan_chars=len(compressed_research_plan),
        cfp_requirements_chars=len(cfp_requirements_text),
        has_cfp_requirements=bool(cfp_requirements_text),
        keywords=section.get("keywords", []),
        topics=section.get("topics", []),
        trace_id=trace_id,
    )

    compressed_shared_context = compress_text(shared_context)
    scientific_analysis_section = "" if scientific_analysis is None else serialize(scientific_analysis).decode()

    full_prompt = SECTION_PROMPT.to_string(
        section_title=section_title,
        length_requirements=length_requirements,
        instructions=section["generation_instructions"],
        keywords=section.get("keywords", []),
        topics=section.get("topics", []),
        cfp_requirements=cfp_requirements_text,
        context=compressed_shared_context,
        research_plan_context=compressed_research_plan,
        scientific_analysis_section=scientific_analysis_section,
    )

    result = await with_evaluation(
        prompt_identifier="section_generation",
        prompt_handler=partial(generate_section_text, min_words=min_words, max_words=max_words),
        prompt=full_prompt,
        trace_id=trace_id,
        max_words=max_words,
        **get_evaluation_kwargs(
            "generate_section_text",
            job_manager,
            section_config=section,
            rag_context=shared_context,
            research_objectives=form_inputs,
            cfp_analysis=cfp_analysis,
        ),
    )

    if result:
        word_count = len(result.split())
        char_count = len(result)
    else:
        word_count = char_count = 0

    logger.info(
        "Completed section text generation",
        section_id=section["id"],
        section_title=section_title,
        generated_words=word_count,
        generated_chars=char_count,
        target_max_words=max_words,
        trace_id=trace_id,
    )

    return result
