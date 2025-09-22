from typing import Final

from packages.db.src.json_objects import CFPAnalysisResult, CFPSectionAnalysis, GrantLongFormSection, ResearchObjective
from packages.shared_utils.src.logger import get_logger

from services.rag.src.constants import MIN_WORDS_RATIO
from services.rag.src.utils.evaluation import EvaluationCriterion, with_prompt_evaluation
from services.rag.src.utils.long_form import generate_long_form_text
from services.rag.src.utils.prompt_compression import compress_prompt_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.source_validation import handle_source_validation

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


SECTION_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="optimized_section_generation",
    template="""
    Write the ${section_title} section for a grant application.

    ## Instructions
    ${instructions}

    ${cfp_requirements}

    ## Research Context
    ${context}

    ## Content Requirements
        - Write substantive, detailed content with specific examples and evidence
        - Include clear objectives, methodological approaches, and expected outcomes
        - Structure content with clear headings, subheadings, and logical flow
        - Incorporate timeline information, milestones, and work plan elements where relevant
        - Use professional academic language with precise scientific terminology
        - Ensure content directly addresses all section requirements comprehensively
        - Provide sufficient detail to demonstrate expertise and feasibility
        - Include specific research questions, hypotheses, and experimental designs
        - Address potential challenges and mitigation strategies
        - Connect to broader research context and clinical significance

    ## Format Guidelines
        - Use markdown formatting with proper headers (## for main sections, ### for subsections)
        - Include bullet points or numbered lists for clarity where appropriate
        - Aim for comprehensive coverage - target 600-1000 words for substantial sections
        - Include specific metrics, timelines, and measurable outcomes
""",
)


async def handle_generate_section_text(
    section: GrantLongFormSection,
    research_deep_dives: list[ResearchObjective],
    shared_context: str,
    cfp_analysis: CFPAnalysisResult,
    trace_id: str,
) -> str:
    section_title = section["title"]

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

    combined_context = f"""
    # Grant Application Context

    {shared_context}

    # Detailed Research Objectives

    {research_context}

    # Section Generation Guidelines
    This section should integrate the above context to create comprehensive, detailed content that demonstrates:
    1. Deep understanding of the research domain
    2. Clear connection to stated objectives
    3. Specific methodological approaches
    4. Realistic timelines and milestones
    5. Innovation and feasibility
    6. Professional academic writing quality
    """

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

    cfp_requirements_text = _format_cfp_requirements_for_section(
        section_title, cfp_analysis["cfp_analysis"] if cfp_analysis else None
    )

    full_prompt = SECTION_PROMPT.to_string(
        section_title=section_title,
        instructions=section["generation_instructions"],
        cfp_requirements=cfp_requirements_text,
        context=validated_context,
    )
    compressed_prompt = compress_prompt_text(full_prompt, aggressive=True)

    return await with_prompt_evaluation(
        prompt_identifier="optimized_section_generation",
        prompt_handler=generate_long_form_text,
        prompt=compressed_prompt,
        increment=15,
        retries=3,
        passing_score=80,
        criteria=[
            EvaluationCriterion(
                name="Content Depth and Detail",
                evaluation_instructions="""
                Evaluate whether the content provides sufficient depth, specific details, and comprehensive coverage of the topic.
                    - Content should be substantive (600+ words for major sections)
                    - Include specific examples, methodologies, and timelines
                    - Demonstrate expert knowledge with concrete details
                    - Avoid generic statements in favor of specific, actionable content
            """,
                weight=1.0,
            ),
            EvaluationCriterion(
                name="Structural Completeness",
                evaluation_instructions="""
                Assess whether the content includes key structural elements and proper organization.
                    - Clear objectives and research questions
                    - Methodological approaches and experimental designs
                    - Work plan elements with timelines
                    - Expected outcomes and success metrics
                    - Proper section organization with headers and subheadings
                """,
                weight=0.95,
            ),
            EvaluationCriterion(
                name="Context Integration and Evidence",
                evaluation_instructions="""
                Evaluate how effectively the content integrates information from the provided research context.
                    - Clear use of provided research context and retrieval data
                    - Specific evidence from context incorporated naturally
                    - Strong connections to stated research objectives
                    - Relevant citations and references to context material
                    - Claims supported by context evidence
                    - Research objectives clearly addressed
                    - Context information woven into narrative seamlessly
                    - No contradictions with provided context
                """,
                weight=0.85,
            ),
            EvaluationCriterion(
                name="Academic Quality and Rigor",
                evaluation_instructions="""
                Assess the professional quality, scientific accuracy, and academic appropriateness of the writing.
                    - Professional, scholarly tone throughout
                    - Precise scientific terminology used correctly
                    - Clear, concise writing with proper grammar
                    - Appropriate academic register and style
                    - Demonstrates understanding of research methodologies
                    - Uses appropriate statistical and analytical approaches
                    - Shows awareness of field standards and best practices
                    - Maintains objectivity and scientific rigor
                """,
                weight=0.8,
            ),
            EvaluationCriterion(
                name="Feasibility and Innovation",
                evaluation_instructions="""
                Evaluate whether the content demonstrates feasible research approaches and innovative elements.
                    - Realistic timelines and resource requirements
                    - Appropriate methodological choices for objectives
                    - Awareness of potential challenges and limitations
                    - Practical implementation considerations
                    - Novel approaches or methodologies where appropriate
                    - Creative solutions to research problems
                    - Advancement beyond current state of knowledge
                    - Potential for significant impact in the field
                """,
                weight=0.75,
            ),
        ],
        trace_id=trace_id,
    )
