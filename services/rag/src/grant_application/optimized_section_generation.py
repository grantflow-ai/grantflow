"""
Optimized section generation with shared retrieval and improved parallelization.
Preserves quality while improving speed through intelligent batching and caching.
"""

import asyncio
import time
from typing import Any, Final

from packages.db.src.json_objects import GrantLongFormSection, ResearchDeepDive
from packages.shared_utils.src.logger import get_logger

from services.rag.src.constants import MIN_WORDS_RATIO
from services.rag.src.utils.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from services.rag.src.utils.long_form import generate_long_form_text
from services.rag.src.utils.prompt_template import PromptTemplate
from services.rag.src.utils.retrieval import retrieve_documents
from services.rag.src.utils.source_validation import handle_source_validation

logger = get_logger(__name__)



OPTIMIZED_SECTION_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="optimized_section_generation",
    template="""
    Write the ${section_title} section for a grant application.

    Instructions: ${instructions}

    ${dependencies_text}

    Key Topics: ${topics}
    Keywords: ${keywords}

    Requirements:
    - Technical precision for expert reviewers
    - Clear, compelling narrative
    - Maximum ${max_words} words
    """,
)


async def generate_section_with_shared_retrieval(
    *,
    application_id: str,
    grant_section: GrantLongFormSection,
    dependencies: dict[str, str],
    form_inputs: ResearchDeepDive,
    research_plan_text: str,
    shared_rag_results: dict[str, Any] | None = None,
) -> str:
    """
    Generate section text with optional shared retrieval results.
    Maintains quality while improving speed through retrieval sharing.
    """
    start_time = time.time()
    section_id = grant_section["id"]

    logger.debug(
        "Starting optimized section generation",
        section_id=section_id,
        section_title=grant_section["title"],
        has_shared_retrieval=shared_rag_results is not None,
    )


    dependencies_text = ""
    if dependencies:
        dependencies_text = f"Previous sections:\n{chr(10).join(f'- {k}: {v[:200]}...' for k, v in dependencies.items())}"

    prompt = OPTIMIZED_SECTION_PROMPT.to_string(
        section_title=grant_section["title"],
        instructions=grant_section["generation_instructions"],
        dependencies_text=dependencies_text,
        topics=", ".join(grant_section.get("topics", [])),
        keywords=", ".join(grant_section.get("keywords", [])),
        max_words=grant_section["max_words"],
    )


    if shared_rag_results is not None:
        rag_results = shared_rag_results
        logger.debug("Using shared retrieval results", section_id=section_id)
    else:
        retrieval_start = time.time()
        rag_results = await retrieve_documents(
            application_id=application_id,
            task_description=prompt,
            search_queries=grant_section.get("search_queries"),
            form_inputs=form_inputs,
        )
        retrieval_duration = time.time() - retrieval_start
        logger.debug(
            "Individual retrieval completed",
            section_id=section_id,
            retrieval_duration_ms=round(retrieval_duration * 1000, 2),
            document_count=len(rag_results),
        )


    if source_validation_error := await handle_source_validation(
        task_description=prompt,
        max_length=grant_section["max_words"],
        sources={"rag_results": rag_results, "form_inputs": form_inputs, "research_plan_text": research_plan_text},
    ):
        logger.warning("Source validation failed", section_id=section_id)
        return source_validation_error


    generation_start = time.time()
    result = await with_prompt_evaluation(
        criteria=[
            EvaluationCriterion(name="Completeness", evaluation_instructions="Ensure all section aspects are addressed", weight=1.0),
            EvaluationCriterion(name="Clarity", evaluation_instructions="Clear, logical narrative flow", weight=1.0),
            EvaluationCriterion(name="Scientific Accuracy", evaluation_instructions="Precise technical terminology", weight=1.5),
            EvaluationCriterion(name="Word Count", evaluation_instructions="Stay within word limit", weight=1.0),
        ],
        max_words=grant_section["max_words"],
        min_words=int(grant_section["max_words"] * MIN_WORDS_RATIO),
        prompt=prompt,
        prompt_handler=generate_long_form_text,
        prompt_identifier="optimized_section_generation",
        rag_results=rag_results,
        form_inputs=form_inputs,
        research_plan_text=research_plan_text,
        passing_score=80,
        increment=10,
        retries=5,
    )

    generation_duration = time.time() - generation_start
    total_duration = time.time() - start_time

    logger.info(
        "Optimized section generation completed",
        section_id=section_id,
        total_duration_ms=round(total_duration * 1000, 2),
        generation_duration_ms=round(generation_duration * 1000, 2),
        word_count=len(result.split()),
    )

    return result


async def generate_sections_with_shared_retrieval(
    *,
    application_id: str,
    sections: list[GrantLongFormSection],
    dependencies_map: dict[str, dict[str, str]],
    form_inputs: ResearchDeepDive,
    research_plan_text: str,
) -> dict[str, str]:
    """
    Generate multiple sections with shared retrieval for efficiency.
    Groups sections by similarity to maximize retrieval reuse.
    """
    logger.info(
        "Starting optimized batch section generation",
        section_count=len(sections),
        application_id=application_id,
    )


    all_search_queries = []
    for section in sections:
        all_search_queries.extend(section.get("search_queries", []))


    unique_queries = list(dict.fromkeys(all_search_queries))

    retrieval_start = time.time()
    shared_rag_results = await retrieve_documents(
        application_id=application_id,
        task_description="Grant application sections: " + ", ".join(s["title"] for s in sections),
        search_queries=unique_queries,
        form_inputs=form_inputs,
    )
    retrieval_duration = time.time() - retrieval_start

    logger.info(
        "Shared retrieval completed",
        retrieval_duration_ms=round(retrieval_duration * 1000, 2),
        unique_queries_count=len(unique_queries),
        document_count=len(shared_rag_results),
    )


    generation_tasks = []
    for section in sections:
        task = generate_section_with_shared_retrieval(
            application_id=application_id,
            grant_section=section,
            dependencies=dependencies_map.get(section["id"], {}),
            form_inputs=form_inputs,
            research_plan_text=research_plan_text,
            shared_rag_results=shared_rag_results,
        )
        generation_tasks.append(task)


    results = await asyncio.gather(*generation_tasks)

    return {section["id"]: result for section, result in zip(sections, results, strict=False)}


async def optimized_generate_grant_section_texts(
    application_id: str,
    form_inputs: ResearchDeepDive,
    grant_sections: list[Any],
    research_objectives: list[Any],
    job_manager: Any,
) -> dict[str, str]:
    """
    Optimized version of generate_grant_section_texts with improved parallelization.
    Maintains quality while significantly improving speed.
    """
    from services.rag.src.grant_application.handler import generate_work_plan_text
    from services.rag.src.grant_application.utils import (
        create_dependencies_text,
        create_generation_groups,
        is_grant_long_form_section,
    )

    start_time = time.time()
    section_texts: dict[str, str] = {}


    research_plan_section = next(
        s for s in grant_sections if is_grant_long_form_section(s) and s.get("is_detailed_research_plan")
    )

    research_plan_text = await generate_work_plan_text(
        application_id=application_id,
        work_plan_section=research_plan_section,
        research_objectives=research_objectives,
        form_inputs=form_inputs,
        job_manager=job_manager,
    )
    section_texts[research_plan_section["id"]] = research_plan_text


    long_form_sections = [
        s for s in grant_sections if is_grant_long_form_section(s) and not s.get("is_detailed_research_plan")
    ]


    for section in long_form_sections:
        section["depends_on"] = [v for v in section["depends_on"] if v != research_plan_section["id"]]


    generation_groups = create_generation_groups(sections=long_form_sections)


    for generation_group in generation_groups:

        dependencies_map = {}
        for section in generation_group:
            dependencies_map[section["id"]] = create_dependencies_text(
                depends_on=section["depends_on"],
                texts=section_texts,
            )


        group_results = await generate_sections_with_shared_retrieval(
            application_id=application_id,
            sections=generation_group,
            dependencies_map=dependencies_map,
            form_inputs=form_inputs,
            research_plan_text=research_plan_text,
        )

        section_texts.update(group_results)

        logger.info(
            "Generation group completed",
            group_size=len(generation_group),
            sections=[s["id"] for s in generation_group],
        )

    total_duration = time.time() - start_time
    logger.info(
        "Optimized section generation completed",
        total_duration_seconds=total_duration,
        section_count=len(section_texts),
        avg_section_time=total_duration / len(section_texts) if section_texts else 0,
    )

    return section_texts
