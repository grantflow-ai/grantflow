from typing import Any, Final

from src.constants import MIN_WORDS_RATIO
from src.db.json_objects import GrantLongFormSection
from src.rag.llm_evaluation import EvaluationCriterion, with_prompt_evaluation
from src.rag.long_form import generate_long_form_text
from src.rag.retrieval import retrieve_documents
from src.rag.source_validation import handle_source_validation
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

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
    user_inputs: dict[str, str],
    workplan_text: str,
) -> str:
    logger.debug("Generating section text.", grant_section=grant_section)

    prompt = GENERATE_SECTION_TEXT_USER_PROMPT.to_string(
        dependencies=dependencies,
        instructions=grant_section["generation_instructions"],
        keywords=grant_section["keywords"],
        section_title=grant_section["title"],
        topics=grant_section["topics"],
    )

    rag_results = await retrieve_documents(
        application_id=application_id,
        task_description=prompt,
        search_queries=grant_section.get("search_queries"),
        user_inputs=user_inputs,
    )

    if source_validation_error := await handle_source_validation(
        task_description=str(prompt),
        max_length=grant_section["max_words"],
        sources={"rag_results": rag_results, "user_inputs": user_inputs, "workplan_text": workplan_text},
    ):
        return source_validation_error

    return await with_prompt_evaluation(
        criteria=evaluation_criteria,
        max_words=grant_section["max_words"],
        min_words=int(grant_section["max_words"] * MIN_WORDS_RATIO),
        prompt=prompt,
        prompt_handler=handle_section_text_generation,
        prompt_identifier="generate_section_text",
        rag_results=rag_results,
        user_inputs=user_inputs,
        workplan_text=workplan_text,
        passing_score=80,
        increment=10,
        retries=5,
    )
