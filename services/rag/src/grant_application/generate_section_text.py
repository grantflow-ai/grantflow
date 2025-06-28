"""
Section generation with shared retrieval and improved parallelization.
Preserves quality while improving speed through intelligent batching and caching.
"""

import time
from typing import Final

from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.sync import batched_gather

from services.rag.src.constants import MIN_WORDS_RATIO
from services.rag.src.utils.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from services.rag.src.utils.long_form import generate_long_form_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.source_validation import handle_source_validation

logger = get_logger(__name__)


SECTION_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="optimized_section_generation",
    template="""Write the ${section_title} section for a grant application.

## Instructions
${instructions}

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
- Include specific metrics, timelines, and measurable outcomes""",
)


async def generate_sections_with_shared_retrieval(
    sections: list[GrantLongFormSection],
    research_deep_dives: list[ResearchDeepDive],
    application_id: str,
) -> dict[str, str]:
    """
    Generate multiple sections using shared retrieval for efficiency.

    Performance optimization: Single retrieval call for all sections instead of
    individual calls, reducing latency and improving consistency.

    Args:
        sections: List of sections to generate
        research_deep_dives: Research context for generation
        application_id: Application ID for retrieval

    Returns:
        Dictionary mapping section IDs to generated text
    """
    if not sections:
        return {}

    logger.info(
        "Starting optimized section generation with shared retrieval",
        sections_count=len(sections),
        deep_dives_count=len(research_deep_dives),
    )

    start_time = time.time()

    all_search_queries = []
    all_keywords = []

    for section in sections:
        all_search_queries.extend(section.get("search_queries", []))
        all_keywords.extend(section.get("keywords", []))

    all_search_queries.extend(
        research_objective["title"] for research_objective in research_deep_dives if "title" in research_objective
    )

    unique_queries = list(dict.fromkeys(all_search_queries))[:12]

    logger.info(
        "Performing shared retrieval for all sections",
        unique_queries_count=len(unique_queries),
        total_original_queries=len(all_search_queries),
    )

    combined_task_description = f"Generate content for {len(sections)} grant application sections: " + ", ".join(
        [s.get("title", f"Section {i}") for i, s in enumerate(sections)]
    )

    shared_context = await retrieve_documents(
        application_id=application_id,
        search_queries=unique_queries,
        task_description=combined_task_description,
        max_tokens=12000,
    )

    retrieval_time = time.time() - start_time
    logger.info(
        "Shared retrieval completed",
        retrieval_time_seconds=retrieval_time,
        context_length=len(shared_context),
    )

    generation_coroutines = [
        _generate_single_section_with_context(section, research_deep_dives, shared_context) for section in sections
    ]

    section_results = await batched_gather(*generation_coroutines, batch_size=3)

    results = {}
    for section, result in zip(sections, section_results, strict=False):
        section_id = section.get("id", section.get("title", f"section_{len(results)}"))
        results[section_id] = result

    total_time = time.time() - start_time
    logger.info(
        "Optimized section generation completed",
        total_time_seconds=total_time,
        retrieval_time_seconds=retrieval_time,
        generation_time_seconds=total_time - retrieval_time,
        sections_generated=len(results),
        avg_time_per_section=total_time / len(sections) if sections else 0,
    )

    return results


async def _generate_single_section_with_context(
    section: GrantLongFormSection,
    research_deep_dives: list[ResearchDeepDive],
    shared_context: str,
) -> str:
    """
    Generate a single section using shared retrieval context.

    Args:
        section: Section configuration
        research_deep_dives: Research context
        shared_context: Pre-retrieved shared context

    Returns:
        Generated section text
    """
    section_title = section.get("title", "Section")

    logger.info(
        "Generating section with shared context",
        section_title=section_title,
        shared_context_length=len(shared_context),
    )

    research_context_parts = []
    for research_objective in research_deep_dives:
        context_part = f"""## Research Objective {research_objective["number"]}: {research_objective["title"]}

**Objective Details:**
{research_objective.get("description", research_objective["title"])}

**Research Context:**
{research_objective.get("enriched_text", "No additional context available.")}

**Key Elements:**
- Research Focus: {research_objective.get("focus_area", "Not specified")}
- Methodology: {research_objective.get("methodology", "To be determined")}
- Expected Outcomes: {research_objective.get("expected_outcomes", "Detailed outcomes to be defined")}"""
        research_context_parts.append(context_part)

    research_context = "\n\n".join(research_context_parts)

    combined_context = f"""# Grant Application Context

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
6. Professional academic writing quality"""

    task_description = (
        f"Generate the {section_title} section. Instructions: {section.get('generation_instructions', '')}"
    )
    validation_error = await handle_source_validation(
        task_description=task_description,
        max_length=section.get("max_words", 1000),
        minimum_percentage=MIN_WORDS_RATIO * 100,
        retrieval_context=shared_context,
        research_context=research_context,
    )
    if validation_error:
        logger.warning(
            "Source validation failed for section",
            section_title=section_title,
            error=validation_error,
        )

        return ""

    validated_context = combined_context

    prompt = SECTION_PROMPT.to_string(
        section_title=section_title,
        instructions=section.get("generation_instructions", f"Write the {section_title} section"),
        context=validated_context,
    )

    result = await with_prompt_evaluation(
        prompt_identifier="optimized_section_generation",
        prompt_handler=generate_long_form_text,
        prompt=prompt,
        increment=15,
        retries=3,
        passing_score=80,
        criteria=[
            EvaluationCriterion(
                name="Content Depth and Detail",
                evaluation_instructions="""Evaluate whether the content provides sufficient depth, specific details, and comprehensive coverage of the topic.

## Requirements
- Content should be substantive (600+ words for major sections)
- Include specific examples, methodologies, and timelines
- Demonstrate expert knowledge with concrete details
- Avoid generic statements in favor of specific, actionable content

## Quality Indicators
- Detailed methodological descriptions
- Specific research questions and hypotheses
- Concrete timelines and milestones
- Evidence-based claims and citations""",
                weight=1.0,
            ),
            EvaluationCriterion(
                name="Structural Completeness",
                evaluation_instructions="""Assess whether the content includes key structural elements and proper organization.

## Required Elements
- Clear objectives and research questions
- Methodological approaches and experimental designs
- Work plan elements with timelines
- Expected outcomes and success metrics
- Proper section organization with headers and subheadings

## Structure Quality
- Logical flow from introduction to conclusion
- Clear headings and subheadings (markdown formatted)
- Bullet points and numbered lists where appropriate
- Comprehensive coverage of all section requirements""",
                weight=0.95,
            ),
            EvaluationCriterion(
                name="Context Integration and Evidence",
                evaluation_instructions="""Evaluate how effectively the content integrates information from the provided research context.

## Integration Quality
- Clear use of provided research context and retrieval data
- Specific evidence from context incorporated naturally
- Strong connections to stated research objectives
- Relevant citations and references to context material

## Evidence Standards
- Claims supported by context evidence
- Research objectives clearly addressed
- Context information woven into narrative seamlessly
- No contradictions with provided context""",
                weight=0.85,
            ),
            EvaluationCriterion(
                name="Academic Quality and Rigor",
                evaluation_instructions="""Assess the professional quality, scientific accuracy, and academic appropriateness of the writing.

## Academic Standards
- Professional, scholarly tone throughout
- Precise scientific terminology used correctly
- Clear, concise writing with proper grammar
- Appropriate academic register and style

## Research Competence
- Demonstrates understanding of research methodologies
- Uses appropriate statistical and analytical approaches
- Shows awareness of field standards and best practices
- Maintains objectivity and scientific rigor""",
                weight=0.8,
            ),
            EvaluationCriterion(
                name="Feasibility and Innovation",
                evaluation_instructions="""Evaluate whether the content demonstrates feasible research approaches and innovative elements.

## Feasibility Assessment
- Realistic timelines and resource requirements
- Appropriate methodological choices for objectives
- Awareness of potential challenges and limitations
- Practical implementation considerations

## Innovation Elements
- Novel approaches or methodologies where appropriate
- Creative solutions to research problems
- Advancement beyond current state of knowledge
- Potential for significant impact in the field""",
                weight=0.75,
            ),
        ],
    )

    logger.info(
        "Section generation completed",
        section_title=section_title,
        result_length=len(result),
        word_count=len(result.split()),
    )

    return result


async def generate_section_text(
    section: GrantLongFormSection,
    research_deep_dives: list[ResearchDeepDive],
    application_id: str,
) -> str:
    """
    Generate text for a single section (backward compatibility).

    For new code, prefer generate_sections_with_shared_retrieval for better performance.
    """
    results = await generate_sections_with_shared_retrieval([section], research_deep_dives, application_id)

    section_id = section.get("id", section.get("title", "section"))
    return results.get(section_id, "")


optimized_generate_grant_section_texts = generate_sections_with_shared_retrieval
