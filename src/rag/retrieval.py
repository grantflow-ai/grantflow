from typing import Any, Final, TypedDict, cast

from sqlalchemy import func, or_, select

from src.constants import GENERATION_MODEL
from src.db.connection import get_session_maker
from src.db.tables import GrantApplicationFile, OrganizationFile, RagFile, TextVector
from src.exceptions import EvaluationError
from src.rag.completion import handle_completions_request
from src.rag.dto import DocumentDTO
from src.rag.post_processing import post_process_documents
from src.rag.search_queries import handle_create_search_queries
from src.utils.embeddings import generate_embeddings
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

MAX_RESULTS: Final[int] = 25

GUIDED_RETRIEVAL_SYSTEM_PROMPT: Final[str] = """
You are an AI assistant specializing in evaluating the relevance and comprehensiveness of information retrieved from a vector database for the purpose of completing a specific task.
"""

GUIDED_RETRIEVAL_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="guided_retrieval",
    template="""
    Your task is to analyze the following components and determine whether the retrieved information when combined with the contents of the prompt has sufficient quality, detail and depth to support the text generation task.

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

    ## Evaluation Criteria

    Consider the following criteria when evaluating the RAG results:

    * **Task Alignment:** Do the retrieved documents provide information that is directly relevant to the task outlined in the prompt?
    * **Comprehensiveness:** Do the results provide a sufficient depth of information to adequately address the task?

    ## Output

    Provide a JSON object with the following structure:

    ```jsonc
    {
      "is_sufficient": false,  // or true, if the results are sufficient.
      "reason": "Explanation of the assessment",
      "new_queries": ["list of improved queries"] // should be empty if is_sufficient is true
    }
    ```
    """,
)


class GuidedRetrievalToolResponse(TypedDict):
    """Response from guided retrieval."""

    is_sufficient: bool
    """Whether the RAG results are sufficient."""
    reason: str
    """Explanation of the assessment."""
    new_queries: list[str]
    """List of improved queries."""


guided_retrieval_json_schema: Final[dict[str, Any]] = {
    "type": "object",
    "properties": {
        "is_sufficient": {"type": "boolean"},
        "reason": {"type": "string"},
        "new_queries": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["is_sufficient", "reason", "new_queries"],
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
    """Retrieve vectors from the vector store based on the given embedding.

    Args:
        application_id: The application ID, required if organization_id is not provided.
        embeddings: The embeddings matrix to compare against.
        file_table_cls: The file table class.
        iteration: The iteration count
        limit: The maximum number of results to return.
        organization_id: The organization ID, required if application_id is not provided.

    Returns:
        The retrieved vectors.
    """
    session_maker = get_session_maker()

    max_threshold = 1.0
    threshold = min(0.25 + 0.15 * iteration, max_threshold)
    similarity_conditions = [TextVector.embedding.cosine_distance(embedding) <= threshold for embedding in embeddings]

    async with session_maker() as session:
        result = list(
            await session.scalars(
                select(TextVector)
                .join(RagFile, TextVector.rag_file_id == RagFile.id)
                .join(file_table_cls, RagFile.id == file_table_cls.rag_file_id)
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
    """Retrieve documents from the vector store.

    Args:
        application_id: The application ID, required if organization_id is not provided.
        max_results: The maximum number of results to retrieve.
        organization_id: The organization ID, required if application_id is not provided.
        search_queries: The search queries.

    Returns:
        The retrieved documents.
    """
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
    """Retrieve documents from the vector store.

    Args:
        application_id: The application ID, required if organization_id is not provided.
        max_results: The maximum number of results to retrieve.
        max_tokens: Maximum token count when post-processing.
        model: The model to use for token counting.
        organization_id: The organization ID, required if application_id is not provided.
        search_queries: The search queries.
        task_description: The task description.
        with_guided_retrieval: Whether to use guided retrieval.
        **kwargs: Additional keyword arguments.

    Raises:
        ValueError: If neither application_id nor organization_id is provided.
        EvaluationError: If the guided retrieval response indicates insufficient context.

    Returns:
        List of document content strings.
    """
    if not application_id and not organization_id:
        raise ValueError("Either application_id or organization_id must be provided.")

    search_queries = search_queries or await handle_create_search_queries(user_prompt=task_description, **kwargs)

    attempts = 0

    while attempts < 3:
        attempts += 1

        vectors = await handle_retrieval(
            application_id=application_id,
            organization_id=organization_id,
            search_queries=search_queries,
            max_results=max_results,
        )

        documents = [
            cast(
                DocumentDTO,
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

        if not with_guided_retrieval:
            return processed_contents

        tool_response: GuidedRetrievalToolResponse = await handle_completions_request(
            prompt_identifier="guided_retrieval",
            response_schema=guided_retrieval_json_schema,
            response_type=GuidedRetrievalToolResponse,
            system_prompt=GUIDED_RETRIEVAL_SYSTEM_PROMPT,
            messages=GUIDED_RETRIEVAL_USER_PROMPT.to_string(
                task_description=task_description,
                queries=search_queries,
                rag_results=processed_contents,
            ),
        )

        if tool_response.get("is_sufficient", False):
            return processed_contents

        logger.info(
            "Guided retrieval response indicated insufficient context",
            reason=tool_response.get("reason", ""),
            attempts=attempts,
        )

        search_queries = tool_response.get("new_queries", [])

    raise EvaluationError("Insufficient context retrieved")
