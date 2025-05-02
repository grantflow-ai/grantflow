from typing import Any, Final, TypedDict, cast

from packages.db.src.connection import get_session_maker
from packages.db.src.tables import GrantApplicationFile, OrganizationFile, RagSource, TextVector
from packages.shared_utils.src.embeddings import generate_embeddings
from packages.shared_utils.src.logger import get_logger
from services.backend.src.constants import ANTHROPIC_SONNET_MODEL, GENERATION_MODEL
from services.backend.src.rag.completion import handle_completions_request
from services.backend.src.rag.dto import DocumentDTO
from services.backend.src.rag.post_processing import post_process_documents
from services.backend.src.rag.search_queries import handle_create_search_queries
from services.backend.src.utils.prompt_template import PromptTemplate
from sqlalchemy import func, or_, select

logger = get_logger(__name__)

MAX_RESULTS: Final[int] = 100
MAX_OPTIMIZATION_ATTEMPTS: Final[int] = 2
MIN_QUALITY_SCORE: Final[float] = 7.0

RETRIEVAL_OPTIMIZATION_SYSTEM_PROMPT: Final[str] = """
You are an AI assistant specializing in evaluating and improving information retrieval quality for Retrieval Augmented Generation (RAG) systems.
Your goal is to optimize the quality, relevance, depth, and diversity of information retrieved to maximize the performance of downstream generation tasks.
"""

RETRIEVAL_OPTIMIZATION_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="retrieval_optimization",
    template="""
    Your task is to analyze the retrieved information quality and provide detailed feedback to optimize retrieval for the generation task.

    ## Generation Task Description
    This is the task description:
        <task_description>
        ${task_description}
        </task_description>

    ## Search Queries
    These queries were used to retrieve information relevant to the task:
        <queries>
        ${queries}
        </queries>

    ## RAG Results
    These are the documents retrieved from the vector database based on the search queries:
        <rag_results>
        ${rag_results}
        </rag_results>

    ## Quality Assessment

    Evaluate the retrieval quality on the following dimensions (score each from 0-10):

    1. **Relevance:** How directly does the information address the task's specific needs?
    2. **Comprehensiveness:** How complete is the coverage of key aspects needed for the task?
    3. **Information Diversity:** How well does the retrieval cover different aspects and perspectives?
    4. **Depth:** How detailed and substantive is the information for critical aspects?
    5. **Freshness:** Are there any gaps in current information that might benefit from more recent sources?

    ## Optimization Strategy

    For any dimension scoring below 8, provide specific improvement suggestions:
    - Identify specific information gaps
    - Recommend new query strategies
    - Suggest alternative phrasings or terminology

    ## Output Format

    Provide a JSON object with the following structure:

    ```jsonc
    {
      "assessment": {
        "relevance_score": 7,  // 0-10 scale
        "comprehensiveness_score": 6,  // 0-10 scale
        "diversity_score": 5,  // 0-10 scale
        "depth_score": 7,  // 0-10 scale
        "freshness_score": 8,  // 0-10 scale
        "overall_score": 6.6,  // average of all scores
        "explanation": "Brief explanation of the quality assessment"
      },
      "optimization": {
        "information_gaps": ["Specific missing information types or aspects"],
        "improved_queries": ["List of targeted queries to fill identified gaps"],
        "query_strategies": "Recommendations for improving future queries"
      }
    }
    ```
    """,
)


class RetrievalAssessment(TypedDict):
    relevance_score: float
    comprehensiveness_score: float
    diversity_score: float
    depth_score: float
    freshness_score: float
    overall_score: float
    explanation: str


class RetrievalOptimization(TypedDict):
    information_gaps: list[str]
    improved_queries: list[str]
    query_strategies: str


class RetrievalQualityResponse(TypedDict):
    assessment: RetrievalAssessment
    optimization: RetrievalOptimization


retrieval_quality_schema: Final[dict[str, Any]] = {
    "type": "object",
    "properties": {
        "assessment": {
            "type": "object",
            "properties": {
                "relevance_score": {"type": "number", "minimum": 0, "maximum": 10},
                "comprehensiveness_score": {"type": "number", "minimum": 0, "maximum": 10},
                "diversity_score": {"type": "number", "minimum": 0, "maximum": 10},
                "depth_score": {"type": "number", "minimum": 0, "maximum": 10},
                "freshness_score": {"type": "number", "minimum": 0, "maximum": 10},
                "overall_score": {"type": "number", "minimum": 0, "maximum": 10},
                "explanation": {"type": "string"},
            },
            "required": [
                "relevance_score",
                "comprehensiveness_score",
                "diversity_score",
                "depth_score",
                "freshness_score",
                "overall_score",
                "explanation",
            ],
        },
        "optimization": {
            "type": "object",
            "properties": {
                "information_gaps": {"type": "array", "items": {"type": "string"}},
                "improved_queries": {"type": "array", "items": {"type": "string"}},
                "query_strategies": {"type": "string"},
            },
            "required": ["information_gaps", "improved_queries", "query_strategies"],
        },
    },
    "required": ["assessment", "optimization"],
}


async def retrieve_vectors_for_embedding(
    *,
    application_id: str | None = None,
    embeddings: list[list[float]],
    file_table_cls: type[GrantApplicationFile | OrganizationFile],
    iteration: int = 1,
    limit: int = MAX_RESULTS,
    organization_id: str | None = None,
) -> list[TextVector]:
    session_maker = get_session_maker()

    max_threshold = 1.0
    threshold = min(0.25 + 0.15 * iteration, max_threshold)
    similarity_conditions = [TextVector.embedding.cosine_distance(embedding) <= threshold for embedding in embeddings]

    async with session_maker() as session:
        result = list(
            await session.scalars(
                select(TextVector)
                .join(RagSource, TextVector.rag_source_id == RagSource.id)
                .join(file_table_cls, RagSource.id == file_table_cls.rag_file_id)
                .where(
                    file_table_cls.grant_application_id == application_id
                    if hasattr(file_table_cls, "grant_application_id")
                    else file_table_cls.funding_organization_id == organization_id
                )
                .where(or_(*similarity_conditions))
                .order_by(func.least(*[TextVector.embedding.cosine_distance(embedding) for embedding in embeddings]))
                .limit(limit)
            )
        )

    if len(result) < limit and threshold < 1.0:
        return await retrieve_vectors_for_embedding(
            file_table_cls=file_table_cls,
            application_id=application_id,
            organization_id=organization_id,
            embeddings=embeddings,
            limit=limit,
            iteration=iteration + 1,
        )

    if not result and threshold >= max_threshold:
        logger.warning("No results found within the threshold range.")

    return result


async def handle_retrieval(
    *,
    application_id: str | None = None,
    max_results: int,
    organization_id: str | None = None,
    search_queries: list[str],
) -> list[TextVector]:
    query_embeddings = await generate_embeddings(search_queries)
    file_table_cls = GrantApplicationFile if application_id else OrganizationFile

    return (
        await retrieve_vectors_for_embedding(
            file_table_cls=file_table_cls,
            application_id=application_id,
            organization_id=organization_id,
            embeddings=query_embeddings,
            limit=max_results,
        )
        if len(query_embeddings)
        else []
    )


async def retrieve_documents(
    *,
    application_id: str | None = None,
    max_results: int = MAX_RESULTS,
    max_tokens: int = 4000,
    model: str = GENERATION_MODEL,
    organization_id: str | None = None,
    search_queries: list[str] | None = None,
    task_description: str | PromptTemplate,
    with_guided_retrieval: bool = False,
    **kwargs: Any,
) -> list[str]:
    if not application_id and not organization_id:
        raise ValueError("Either application_id or organization_id must be provided.")

    search_queries = search_queries or await handle_create_search_queries(user_prompt=task_description, **kwargs)

    attempts = 0
    previous_scores: list[float] = []
    best_score = 0.0

    vectors = await handle_retrieval(
        application_id=application_id,
        organization_id=organization_id,
        search_queries=search_queries,
        max_results=max_results,
    )

    documents = [
        cast(
            "DocumentDTO",
            {k: v for k, v in vector.chunk.items() if k in DocumentDTO.__annotations__ and v is not None},
        )
        for vector in vectors
    ]

    processed_contents = await post_process_documents(
        documents=documents,
        query=",".join(search_queries),
        task_description=str(task_description),
        max_tokens=max_tokens,
        model=model,
    )

    if not with_guided_retrieval or not processed_contents:
        return processed_contents

    best_processed_contents = processed_contents
    while attempts < MAX_OPTIMIZATION_ATTEMPTS:
        attempts += 1

        quality_response = await handle_completions_request(
            prompt_identifier="retrieval_optimization",
            response_schema=retrieval_quality_schema,
            response_type=RetrievalQualityResponse,
            system_prompt=RETRIEVAL_OPTIMIZATION_SYSTEM_PROMPT,
            model=ANTHROPIC_SONNET_MODEL,
            messages=RETRIEVAL_OPTIMIZATION_USER_PROMPT.to_string(
                task_description=task_description,
                queries=search_queries,
                rag_results=processed_contents,
            ),
        )

        assessment = quality_response["assessment"]
        current_score = assessment["overall_score"]

        logger.info(
            "Retrieval quality assessment",
            attempt=attempts,
            overall_score=current_score,
            relevance=assessment["relevance_score"],
            comprehensiveness=assessment["comprehensiveness_score"],
            diversity=assessment["diversity_score"],
            depth=assessment["depth_score"],
            explanation=assessment["explanation"],
        )

        if current_score > best_score:
            best_score = current_score
            best_processed_contents = processed_contents

        if current_score >= MIN_QUALITY_SCORE:
            logger.info("Retrieval quality meets target threshold", score=current_score, threshold=MIN_QUALITY_SCORE)
            return best_processed_contents

        previous_scores.append(current_score)
        if attempts > 1 and (current_score - previous_scores[-2]) < 0.5:
            logger.info(
                "Retrieval quality optimization plateaued", last_score=previous_scores[-2], current_score=current_score
            )
            return best_processed_contents

        optimization = quality_response["optimization"]
        improved_queries = optimization["improved_queries"]

        if not improved_queries:
            logger.info("No improved queries suggested, ending optimization")
            return best_processed_contents

        logger.info(
            "Using improved queries for retrieval optimization",
            queries=improved_queries,
            information_gaps=optimization["information_gaps"],
        )

        new_vectors = await handle_retrieval(
            application_id=application_id,
            organization_id=organization_id,
            search_queries=improved_queries,
            max_results=max_results,
        )

        new_documents = [
            cast(
                "DocumentDTO",
                {k: v for k, v in vector.chunk.items() if k in DocumentDTO.__annotations__ and v is not None},
            )
            for vector in new_vectors
        ]

        combined_documents = documents + new_documents

        processed_contents = await post_process_documents(
            documents=combined_documents,
            query=",".join(search_queries + improved_queries),
            task_description=str(task_description),
            max_tokens=max_tokens,
            model=model,
        )

        search_queries = improved_queries

    logger.info("Completed retrieval optimization", attempts=attempts, final_score=best_score)

    return best_processed_contents
