from functools import partial
from typing import TYPE_CHECKING, Any, Final

from packages.db.src.json_objects import CFPAnalysisResult, CFPSectionAnalysis, GrantLongFormSection, ResearchObjective
from packages.shared_utils.src.logger import get_logger

from services.rag.src.constants import MIN_WORDS_RATIO
from services.rag.src.evaluation_criteria import get_evaluation_kwargs
from services.rag.src.utils.evaluation import with_prompt_evaluation
from services.rag.src.utils.long_form import generate_long_form_text
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.source_validation import handle_source_validation

if TYPE_CHECKING:
    from services.rag.src.grant_application.dto import StageDTO
    from services.rag.src.utils.job_manager import JobManager

logger = get_logger(__name__)


def _format_cfp_requirements_for_section(section_title: str, cfp_analysis: CFPSectionAnalysis | None) -> str:
    if not cfp_analysis:
        return ""

    section_title_lower = section_title.lower()
    relevant_requirements = [
        section_req
        for section_req in cfp_analysis["required_sections"]
        if section_req["section_name"].lower() in section_title_lower
        or section_title_lower in section_req["section_name"].lower()
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

    if not relevant_requirements and not relevant_constraints and not relevant_criteria:
        return ""

    cfp_text = "## CFP Requirements\n\n"

    if relevant_requirements:
        cfp_text += "### Section Requirements\n"
        for req_section in relevant_requirements:
            cfp_text += f"**{req_section['section_name']}:**\n"
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

    return cfp_text


def _get_section_length_requirements(section_title: str) -> str:
    section_title_lower = section_title.lower()

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

## Length Requirements
${length_requirements}

## Section-Specific Instructions
${instructions}

## Section Focus Areas
Keywords: ${keywords}
Topics: ${topics}

These keywords and topics should guide the focus and scope of this section, but ALL scientific content must be grounded in the research context and research plan below.

${cfp_requirements}

## Research Context (Scientific Papers Data)
${context}

## CRITICAL: RAG Data Usage Requirements
**You are writing based on scientific papers and research data provided above. The scientists have given us this specific data to use.**

MANDATORY STEPS BEFORE WRITING:
1. **Extract and quote extensively** from the research context - this is real scientific data that MUST be incorporated
2. **Pre-identify specific n-grams** from the RAG context to use:
   - Find at least 5 scientific 1-grams (single technical terms like "apoptosis", "CRISPR")
   - Find 5-10 relevant 2-grams (compound terms like "tumor microenvironment", "immune checkpoint")
   - Find 5-10 relevant 3-grams (technical phrases like "single-cell RNA sequencing", "patient-derived xenograft models")
   - Find 5-10 relevant 4-grams (complex expressions like "tumor-associated macrophage polarization states")
3. **Plan integration** of these identified terms throughout your writing

## Research Plan Grounding (MANDATORY)
${research_plan_context}

ALL scientific content and methodology descriptions MUST be grounded in and consistent with the Research Plan above:
- If describing methods, timelines, or resources: Reference specific objectives and tasks by number (e.g., "as outlined in Objective 2, Task 2.3")
- If describing aims or significance: Connect to the high-level objectives from the Research Plan
- If describing team or administrative details: Ensure alignment with research requirements
- NEVER contradict the Research Plan - only expand, elaborate, and support it with evidence from the scientific literature

## Content Requirements
- **QUOTE AND USE RAG DATA EXTENSIVELY** - this is provided scientific research that must be incorporated
- Write substantive, detailed content with specific examples and evidence FROM THE RAG CONTEXT
- Ground all scientific claims and methodologies in BOTH the research context AND the Research Plan
- Include clear objectives, methodological approaches, and expected outcomes BASED ON PROVIDED DATA
- Structure content with clear headings, subheadings, and logical flow
- Incorporate timeline information, milestones, and work plan elements where relevant
- Use professional academic language with precise scientific terminology FROM THE RAG
- Ensure content directly addresses all section requirements comprehensively USING RAG DATA
- Provide sufficient detail to demonstrate expertise and feasibility WITH RAG EVIDENCE
- Include specific research questions, hypotheses, and experimental designs FROM RAG CONTEXT
- Address potential challenges and mitigation strategies MENTIONED IN RAG DATA
- Connect to broader research context and clinical significance AS PROVIDED IN RAG

## Scientific Writing with RAG Integration
- **Primary Goal**: Maximize use of provided RAG research context - quote, paraphrase, and reference extensively
- **Secondary Goal**: Use the pre-identified n-grams naturally throughout the text for scientific style
- Weave the identified 1-grams, 2-grams, 3-grams, and 4-grams into the narrative seamlessly
- Maintain scientific rigor by grounding ALL claims in the provided research context
- Treat the RAG context as your primary source material - you are synthesizing scientific papers
- Ensure all scientific content relates to and supports the Research Plan objectives

## Format Guidelines
- Use markdown formatting with proper headers (## for main sections, ### for subsections)
- Include bullet points or numbered lists for clarity where appropriate
- Aim for comprehensive coverage within specified word count targets
- Include specific metrics, timelines, and measurable outcomes FROM RAG DATA
- Quote or reference specific findings, methodologies, and results from the research context
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
    enrichment_responses: list[Any],
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

    # Extract relevant enrichments for this section
    relevant_enrichments = []
    for enrichment in enrichment_responses:
        if "research_objective" in enrichment:
            relevant_enrichments.append(enrichment["research_objective"])
        if "research_tasks" in enrichment:
            relevant_enrichments.extend(enrichment["research_tasks"])

    # Format relationships for context
    relationships_context = ""
    if relationships:
        rel_parts = []
        for source, targets in relationships.items():
            for target, description in targets:
                rel_parts.append(f"- {source} → {target}: {description}")
        if rel_parts:
            relationships_context = "\n## Key Relationships Between Research Components\n" + "\n".join(rel_parts[:10])

    combined_context = f"""
# Scientific Research Papers Context

{shared_context}

# Research Objectives (Detailed)

{research_context}
"""

    # Format research plan context with relationships
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

    cfp_requirements_text = _format_cfp_requirements_for_section(section_title, cfp_analysis["cfp_analysis"])
    length_requirements = _get_section_length_requirements(section_title)

    # Format keywords and topics
    keywords_str = ", ".join(section.get("keywords", []))
    topics_str = ", ".join(section.get("topics", []))

    logger.debug(
        "Prepared context and requirements for section generation",
        section_id=section["id"],
        section_title=section_title,
        combined_context_chars=len(validated_context),
        research_plan_chars=len(formatted_research_plan_context),
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
        context=validated_context,
        research_plan_context=formatted_research_plan_context,
    )
    compressed_prompt = compress_prompt_text(full_prompt, aggressive=True)

    logger.debug(
        "Generated and compressed prompt for section",
        section_id=section["id"],
        section_title=section_title,
        original_prompt_chars=len(full_prompt),
        compressed_prompt_chars=len(compressed_prompt),
        compression_ratio=round(len(compressed_prompt) / len(full_prompt), 2) if full_prompt else 0,
        trace_id=trace_id,
    )

    result = await with_prompt_evaluation(
        prompt_identifier="section_generation",
        prompt_handler=partial(generate_section_text, section=section),
        prompt=compressed_prompt,
        trace_id=trace_id,
        **get_evaluation_kwargs("generate_section_text", job_manager),
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
