from functools import partial
from typing import TYPE_CHECKING, Any, Final

from packages.db.src.json_objects import CFPAnalysisResult, CFPSectionAnalysis, GrantLongFormSection, ResearchObjective
from packages.shared_utils.src.logger import get_logger

from services.rag.src.constants import MIN_WORDS_RATIO
from services.rag.src.evaluation_criteria import get_evaluation_kwargs
from services.rag.src.utils.evaluation import with_evaluation
from services.rag.src.utils.long_form import generate_long_form_text
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.source_validation import handle_source_validation

if TYPE_CHECKING:
    from services.rag.src.grant_application.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)


def _format_cfp_requirements_for_section(section: GrantLongFormSection, cfp_analysis: CFPSectionAnalysis | None) -> str:
    cfp_text = ""

    has_section_data = False

    if definition := section.get("definition"):
        cfp_text += f"## Section Definition\n\n{definition}\n\n"
        has_section_data = True

    if requirements := section.get("requirements"):
        cfp_text += "## CFP Requirements\n\n"
        for req in requirements:
            cfp_text += f"- **{req['requirement']}**\n"
            cfp_text += f'  > *CFP Quote: "{req["quote_from_source"]}"*\n'
            cfp_text += f"  > *Category: {req['category']}*\n\n"
        has_section_data = True

    if length_limit := section.get("length_limit"):
        length_source = section.get("length_source", "Not specified")
        cfp_text += "## Length Requirements\n\n"
        cfp_text += f"- **Word Limit:** {length_limit} words\n"
        cfp_text += f"  > *Source: {length_source}*\n\n"
        has_section_data = True

    if other_limits := section.get("other_limits"):
        cfp_text += "## Additional Constraints\n\n"
        for limit in other_limits:
            cfp_text += f"- **{limit['constraint_type']}:** {limit['constraint_value']}\n"
            cfp_text += f'  > *CFP Quote: "{limit["source_quote"]}"*\n\n'
        has_section_data = True

    if not has_section_data and cfp_analysis:
        section_title = section["title"]
        section_title_lower = section_title.lower()

        relevant_requirements = [
            section_req
            for section_req in cfp_analysis["required_sections"]
            if section_req["title"].lower() in section_title_lower
            or section_title_lower in section_req["title"].lower()
        ]

        relevant_constraints = [
            constraint
            for constraint in cfp_analysis["length_constraints"]
            if section_title_lower in constraint["limit_description"].lower()
            or any(word in constraint["limit_description"].lower() for word in section_title_lower.split())
        ]

        relevant_criteria = [
            criterion
            for criterion in cfp_analysis["evaluation_criteria"]
            if section_title_lower in criterion["criterion_name"].lower()
            or any(word in criterion["criterion_name"].lower() for word in section_title_lower.split())
        ]

        if relevant_requirements or relevant_constraints or relevant_criteria:
            cfp_text += "## CFP Requirements (from global analysis)\n\n"

            if relevant_requirements:
                cfp_text += "### Section Requirements\n"
                for req_section in relevant_requirements:
                    cfp_text += f"**{req_section['title']}:**\n"
                    for req in req_section["requirements"]:
                        cfp_text += f"- {req['requirement']}\n"
                        cfp_text += f'  > *Quote: "{req["quote_from_source"]}"*\n\n'

            if relevant_constraints:
                cfp_text += "### Length Constraints\n"
                for constraint in relevant_constraints:
                    cfp_text += f"- **{constraint['limit_description']}**\n"
                    cfp_text += f'  > *Quote: "{constraint["quote_from_source"]}"*\n\n'

            if relevant_criteria:
                cfp_text += "### Evaluation Criteria\n"
                for criterion in relevant_criteria:
                    cfp_text += f"- **{criterion['criterion_name']}**\n"
                    cfp_text += f'  > *Quote: "{criterion["quote_from_source"]}"*\n\n'

    if evidence := section.get("evidence"):
        cfp_text += f"## CFP Source Reference\n\n{evidence}\n\n"

    return cfp_text


def _get_section_length_requirements(section: GrantLongFormSection) -> str:
    section_title = section["title"]
    section_title_lower = section_title.lower()

    if length_limit := section.get("length_limit"):
        length_source = section.get("length_source", "CFP-specified")
        min_words = int(length_limit * 0.85)
        max_words = length_limit
        return f"Target length: {min_words}-{max_words} words ({length_source})"

    match True:
        case _ if "abstract" in section_title_lower:
            return "Target length: 250-500 words for comprehensive yet concise overview"
        case _ if "research strategy" in section_title_lower or "approach" in section_title_lower:
            return "Target length: 800-1200 words for detailed methodology and experimental design"
        case _ if "preliminary" in section_title_lower or "pilot" in section_title_lower:
            return "Target length: 600-900 words for demonstrating feasibility and initial findings"
        case _ if "aims" in section_title_lower or "objectives" in section_title_lower:
            return "Target length: 400-700 words per aim for clear, specific, and measurable goals"
        case _ if "background" in section_title_lower or "significance" in section_title_lower:
            return "Target length: 700-1000 words for comprehensive context and rationale"
        case _ if "methods" in section_title_lower or "methodology" in section_title_lower:
            return "Target length: 600-1000 words for detailed experimental procedures"
        case _ if "timeline" in section_title_lower or "plan" in section_title_lower:
            return "Target length: 400-600 words for clear milestones and deliverables"
        case _:
            return "Target length: 600-1000 words for comprehensive section coverage"


SECTION_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_generation",
    template="""
Write the ${section_title} section for a grant application.

${length_requirements}

## Section Requirements
${instructions}

Focus areas: ${keywords}
Key topics: ${topics}

${cfp_requirements}

## Research Materials

### Scientific Literature Context
${context}

### Research Plan
${research_plan_context}

## Writing Guidelines

**Source Integration**: Ground all scientific content in the provided research materials. Quote and paraphrase specific findings, methodologies, and data from the literature context. Naturally incorporate domain-specific terminology and technical concepts.

**Research Plan Alignment**: All content must be consistent with the Research Plan. When describing methods, timelines, or resources, reference specific objectives and tasks by number (e.g., "as outlined in Objective 2, Task 2.3"). Never contradict the Research Plan—expand and support it with evidence from the scientific literature.

**Content Depth**: Include specific research questions, hypotheses, experimental designs, methodological approaches, and expected outcomes. Address potential challenges and mitigation strategies. Connect to broader research context and significance.

**Academic Style**: Use professional academic language with precise scientific terminology. Structure content with clear headings and logical flow. Include metrics, timelines, and measurable outcomes where relevant.

**Format**: Use markdown with proper headers (## for main sections, ### for subsections). Include bullet points or numbered lists for clarity. Stay within the specified word count.
""",
)


async def generate_section_text(task_description: str, *, trace_id: str, section: GrantLongFormSection) -> str:
    return await generate_long_form_text(
        task_description=task_description,
        max_words=section["max_words"],
        min_words=int(section["max_words"] * MIN_WORDS_RATIO),
        prompt_identifier="section_generation",
        trace_id=trace_id,
    )


async def handle_generate_section_text(
    section: GrantLongFormSection,
    research_deep_dives: list[ResearchObjective],
    shared_context: str,
    cfp_analysis: CFPAnalysisResult,
    research_plan_text: str,
    enrichment_responses: list[Any],  # noqa: ARG001
    relationships: dict[str, list[tuple[str, str]]],
    trace_id: str,
    job_manager: "JobManager[StageDTO]",
) -> str:
    section_title = section["title"]

    logger.debug(
        "Starting section text generation",
        section_id=section["id"],
        section_title=section_title,
        max_words=section["max_words"],
        shared_context_chars=len(shared_context),
        research_objectives_count=len(research_deep_dives),
        trace_id=trace_id,
    )

    research_context_parts = [
        f"""
        ## Research Objective {research_objective["number"]}: {research_objective["title"]}

        **Objective Details:**
        {research_objective.get("description", research_objective["title"])}

        **Research Context:**
        {research_objective.get("enriched_text", "No additional context available.")}

        **Key Elements:**
        - Research Focus: {research_objective.get("focus_area", "Not specified")}
        - Methodology: {research_objective.get("methodology", "To be determined")}
        - Expected Outcomes: {research_objective.get("expected_outcomes", "Detailed outcomes to be defined")}
        """
        for research_objective in research_deep_dives
    ]

    research_context = "\n\n".join(research_context_parts)

    relationships_context = (
        "\n## Key Relationships Between Research Components\n" + "\n".join(rel_parts[:10])
        if (
            rel_parts := [
                f"- {source} → {target}: {description}"
                for source, targets in relationships.items()
                for target, description in targets
            ]
        )
        else ""
    )

    combined_context = f"""
# Scientific Research Papers Context

{shared_context}

# Research Objectives (Detailed)

{research_context}
"""

    research_plan_context_parts = [f"# Approved Research Plan\n\n{research_plan_text}"]

    if relationships_context:
        research_plan_context_parts.append(relationships_context)

    formatted_research_plan_context = "\n\n".join(research_plan_context_parts)

    task_description = f"Generate the {section_title} section. Instructions: {section['generation_instructions']}"
    validation_error = await handle_source_validation(
        task_description=task_description,
        max_length=section["max_words"],
        minimum_percentage=MIN_WORDS_RATIO * 100,
        retrieval_context=shared_context,
        research_context=research_context,
        trace_id=trace_id,
    )
    if validation_error:
        logger.warning(
            "Source validation identified missing information, proceeding with available context",
            section=section_title,
            missing_info=validation_error,
            trace_id=trace_id,
        )

    validated_context = combined_context

    cfp_requirements_text = _format_cfp_requirements_for_section(section, cfp_analysis["cfp_analysis"])
    length_requirements = _get_section_length_requirements(section)

    keywords_str = ", ".join(section.get("keywords", []))
    topics_str = ", ".join(section.get("topics", []))

    compressed_context = compress_prompt_text(validated_context, aggressive=True)
    compressed_research_plan = compress_prompt_text(formatted_research_plan_context, aggressive=True)

    logger.debug(
        "Prepared and compressed context for section generation",
        section_id=section["id"],
        section_title=section_title,
        original_context_chars=len(validated_context),
        compressed_context_chars=len(compressed_context),
        original_research_plan_chars=len(formatted_research_plan_context),
        compressed_research_plan_chars=len(compressed_research_plan),
        cfp_requirements_chars=len(cfp_requirements_text),
        has_cfp_requirements=bool(cfp_requirements_text),
        keywords=keywords_str,
        topics=topics_str,
        trace_id=trace_id,
    )

    full_prompt = SECTION_PROMPT.to_string(
        section_title=section_title,
        length_requirements=length_requirements,
        instructions=section["generation_instructions"],
        keywords=keywords_str,
        topics=topics_str,
        cfp_requirements=cfp_requirements_text,
        context=compressed_context,
        research_plan_context=compressed_research_plan,
    )

    result = await with_evaluation(
        prompt_identifier="section_generation",
        prompt_handler=partial(generate_section_text, section=section),
        prompt=full_prompt,
        trace_id=trace_id,
        **get_evaluation_kwargs(
            "generate_section_text",
            job_manager,
            section_config=section,
            rag_context=shared_context,
            research_objectives=research_deep_dives,
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
        target_max_words=section["max_words"],
        trace_id=trace_id,
    )

    return result
