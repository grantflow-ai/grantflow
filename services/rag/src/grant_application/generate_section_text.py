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


GENERATE_SECTION_TEXT_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="section_text_generation",
    template="""
    Your task is to write the ${section_title} section of a grant application, ensuring it is scientifically rigorous, compelling, and aligned with the provided instructions and context. This section will be evaluated by scientific experts in the field and must demonstrate technical precision while effectively communicating the research value.

    ## Generation Instructions

    Adhere to these specific instructions to generate the text for this section:

        <instructions>
        ${instructions}
        </instructions>

    ## Dependencies
    These are the generation results for the dependencies of this section (if any):

        <dependencies>
        ${dependencies}
        </dependencies>

    Use the dependencies to ensure that the generated text is consistent with the context and information provided in the previous sections.

    ## Content Guidance

    Use the following topic labels to guide the content of the section:

        <topics>
        ${topics}
        </topics>

    Use these keywords to ground the content in the specific context of the grant application:

        <keywords>
        ${keywords}
        </keywords>
""",
)

evaluation_criteria = [
    EvaluationCriterion(
        name="Completeness",
        evaluation_instructions="""
        - Ensure all aspects of the grant section are addressed.
        - Verify that the text leverages the provided sources.
        """,
    ),
    EvaluationCriterion(
        name="Grounding",
        evaluation_instructions="""
        - Confirm that the content is firmly grounded.
        - Verify accurate buildup on dependencies.
        """,
    ),
    EvaluationCriterion(
        name="Clarity",
        evaluation_instructions="""
        - Ensure the narrative is clear, concise, and free of ambiguity.
        - Verify logical structure and smooth flow of ideas.
        """,
    ),
    EvaluationCriterion(
        name="Scientific Accuracy",
        evaluation_instructions="""
        - Verify the use of precise, field-specific technical terminology.
        - Ensure factual accuracy and absence of fabricated information.
        """,
    ),
    EvaluationCriterion(
        name="Style",
        evaluation_instructions="""
        - Ensure a formal, data-driven tone is maintained.
        - Emphasize succinctness and specificity in the text.
        """,
    ),
    EvaluationCriterion(
        name="Word Count Adherence",
        evaluation_instructions="""
        - Verify that the text does not exceed the allocated word count.
        - Ensure the length is appropriate for the level of detail required.
        """,
    ),
    EvaluationCriterion(
        name="Hellucination",
        evaluation_instructions="""
        - Ensure the text does not contain hallucinated information (invented facts, persons, terms, etc.).
        """,
        weight=1.5,
    ),
]


async def handle_section_text_generation(
    prompt: str,
    *,
    min_words: int,
    max_words: int,
    **kwargs: Any,
) -> str:
    return await generate_long_form_text(
        max_words=max_words,
        min_words=min_words,
        prompt_identifier="generate_section_text",
        task_description=prompt,
        **kwargs,
    )


async def generate_section_text(
    *,
    application_id: str,
    dependencies: dict[str, str],
    grant_section: GrantLongFormSection,
    form_inputs: ResearchDeepDive,
    research_plan_text: str,
) -> str:
    start_time = time.time()
    logger.debug(
        "Starting section text generation",
        section_id=grant_section["id"],
        section_title=grant_section["title"],
        max_words=grant_section["max_words"],
        has_dependencies=len(dependencies) > 0,
    )

    prompt_start = time.time()
    prompt = GENERATE_SECTION_TEXT_USER_PROMPT.to_string(
        dependencies=dependencies,
        instructions=grant_section["generation_instructions"],
        keywords=grant_section["keywords"],
        section_title=grant_section["title"],
        topics=grant_section["topics"],
    )
    prompt_duration = time.time() - prompt_start

    logger.debug(
        "Prompt template rendered",
        section_id=grant_section["id"],
        prompt_length=len(prompt),
        dependency_count=len(dependencies),
        keyword_count=len(grant_section["keywords"]) if grant_section["keywords"] else 0,
        topic_count=len(grant_section["topics"]) if grant_section["topics"] else 0,
        prompt_duration_ms=round(prompt_duration * 1000, 2),
    )

    retrieval_start = time.time()
    rag_results = await retrieve_documents(
        application_id=application_id,
        task_description=prompt,
        search_queries=grant_section.get("search_queries"),
        form_inputs=form_inputs,
    )
    retrieval_duration = time.time() - retrieval_start

    logger.debug(
        "Document retrieval completed",
        section_id=grant_section["id"],
        rag_document_count=len(rag_results),
        search_query_count=len(grant_section.get("search_queries", [])),
        retrieval_duration_ms=round(retrieval_duration * 1000, 2),
    )

    validation_start = time.time()
    if source_validation_error := await handle_source_validation(
        task_description=str(prompt),
        max_length=grant_section["max_words"],
        sources={"rag_results": rag_results, "form_inputs": form_inputs, "research_plan_text": research_plan_text},
    ):
        validation_duration = time.time() - validation_start
        logger.warning(
            "Source validation failed, returning error",
            section_id=grant_section["id"],
            validation_duration_ms=round(validation_duration * 1000, 2),
        )
        return source_validation_error
    validation_duration = time.time() - validation_start

    logger.debug(
        "Source validation passed",
        section_id=grant_section["id"],
        validation_duration_ms=round(validation_duration * 1000, 2),
    )

    generation_start = time.time()
    result = await with_prompt_evaluation(
        criteria=evaluation_criteria,
        max_words=grant_section["max_words"],
        min_words=int(grant_section["max_words"] * MIN_WORDS_RATIO),
        prompt=prompt,
        prompt_handler=handle_section_text_generation,
        prompt_identifier="generate_section_text",
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
        "Section text generation completed",
        section_id=grant_section["id"],
        section_title=grant_section["title"],
        result_word_count=len(result.split()),
        max_words=grant_section["max_words"],
        generation_duration_ms=round(generation_duration * 1000, 2),
        total_duration_ms=round(total_duration * 1000, 2),
    )

    return result