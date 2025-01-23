from typing import Any, Final, TypedDict, cast

from prompt_template import PromptTemplate as _PromptTemplate
from sqlalchemy import select

from src.db.connection import get_session_maker
from src.db.tables import GrantApplicationFile, OrganizationFile, RagFile, TextVector
from src.exceptions import EvaluationError
from src.rag.dto import DocumentDTO
from src.rag.rerank import rerank_vectors
from src.rag.search_queries import handle_create_search_queries
from src.rag.utils import handle_completions_request
from src.utils.embeddings import generate_embeddings
from src.utils.logger import get_logger
from src.utils.prompt_template import PromptTemplate

logger = get_logger(__name__)

MAX_RESULTS: Final[int] = 25
INITIAL_RETRIEVAL_MULTIPLIER: Final[float] = 4.0

GUIDED_RETRIEVAL_SYSTEM_PROMPT: Final[str] = """
You are an AI assistant specializing in evaluating the relevance and comprehensiveness of information retrieved from a vector database for the purpose of completing a specific task.
"""

GUIDED_RETRIEVAL_USER_PROMPT: Final[PromptTemplate] = PromptTemplate(
    name="guided_retrieval",
    template="""
    Your task is to analyze the following components and determine whether the retrieved information when combined with the contents of the user prompt has sufficient quality, detail and depth to support the text generation task.

    ## User Prompt

    This prompt outlines the task that needs to be completed using the retrieved information:

    ${user_prompt}

    ## Search Queries

    These queries were used to retrieve information relevant to the task:

    ${queries}

    ## RAG Results

    These are the documents retrieved from the vector database based on the search queries:

    ${rag_results}

    ## Evaluation Criteria

    Consider the following criteria when evaluating the RAG results:

    * **Task Alignment:** Do the retrieved documents provide information that is directly relevant to the task outlined in the user prompt?
    * **Relevance:** Do the retrieved documents address the key concepts and topics implied by the search queries?
    * **Comprehensiveness:** Do the results provide a diverse range of perspectives and sufficient depth of information to adequately address the task?
    * **Quality:** Are the retrieved documents reliable, authoritative, and up-to-date?

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
    file_table_cls: type[GrantApplicationFile | OrganizationFile],
    application_id: str | None = None,
    organization_id: str | None = None,
    embedding: list[float],
    limit: int = MAX_RESULTS,
) -> list[TextVector]:
    """Retrieve vectors from the vector store based on the given embedding.

    Args:
        file_table_cls: The file table class.
        application_id: The application ID, required if organization_id is not provided.
        organization_id: The organization ID, required if application_id is not provided.
        embedding: The embedding to compare against.
        limit: The maximum number of results to return.

    Returns:
        The retrieved vectors.
    """
    session_maker = get_session_maker()

    async with session_maker() as session:
        return list(
            await session.scalars(
                select(TextVector)
                .join(RagFile, TextVector.rag_file_id == RagFile.id)
                .join(file_table_cls, RagFile.id == file_table_cls.rag_file_id)
                .where(
                    file_table_cls.grant_application_id == application_id
                    if hasattr(file_table_cls, "grant_application_id")
                    else file_table_cls.funding_organization_id == organization_id
                )
                .order_by(TextVector.embedding.cosine_distance(embedding))
                .limit(limit)
            )
        )


async def handle_retrieval(
    *,
    application_id: str | None = None,
    limit: int,
    organization_id: str | None = None,
    search_queries: list[str],
) -> list[TextVector]:
    """Retrieve documents from the vector store.

    Args:
        application_id: The application ID, required if organization_id is not provided.
        limit: The maximum number of results to retrieve
        organization_id: The organization ID, required if application_id is not provided.
        search_queries: The search queries.

    Returns:
        The retrieved documents.
    """
    query_embeddings = await generate_embeddings(",".join(search_queries))

    file_table_cls = GrantApplicationFile if application_id else OrganizationFile

    return await retrieve_vectors_for_embedding(
        file_table_cls=file_table_cls,
        application_id=application_id,
        organization_id=organization_id,
        embedding=query_embeddings[0],
        limit=limit,
    )


async def retrieve_documents(
    *,
    application_id: str | None = None,
    max_results: int = MAX_RESULTS,
    organization_id: str | None = None,
    rerank: bool = False,
    search_queries: list[str] | None = None,
    user_prompt: str | _PromptTemplate,
    **kwargs: Any,
) -> list[DocumentDTO]:
    """Retrieve documents from the vector store.

    Args:
        application_id: The application ID, required if organization_id is not provided.
        max_results: The maximum number of results to retrieve.
        organization_id: The organization ID, required if application_id is not provided.
        rerank: Whether to rerank the retrieved documents.
        search_queries: The search queries.
        user_prompt: The user prompt.
        **kwargs: Additional keyword arguments.

    Raises:
        ValueError: If neither application_id nor organization_id is provided.
        EvaluationError: If the guided retrieval response indicates insufficient context.

    Returns:
        The retrieved documents.
    """
    if not application_id and not organization_id:
        raise ValueError("Either application_id or organization_id must be provided.")

    search_queries = search_queries or await handle_create_search_queries(user_prompt=user_prompt, **kwargs)
    limit = int(max_results * INITIAL_RETRIEVAL_MULTIPLIER) if rerank else max_results

    attempts = 0
    vectors: list[TextVector] = []

    has_sufficient_context = False

    while attempts < 3:
        attempts += 1

        vectors = await handle_retrieval(
            application_id=application_id,
            organization_id=organization_id,
            search_queries=search_queries,
            limit=limit,
        )

        tool_response = await handle_completions_request(
            prompt_identifier="guided_retrieval",
            response_schema=guided_retrieval_json_schema,
            response_type=GuidedRetrievalToolResponse,
            system_prompt=GUIDED_RETRIEVAL_SYSTEM_PROMPT,
            messages=GUIDED_RETRIEVAL_USER_PROMPT.to_string(
                user_prompt=user_prompt,
                queries=search_queries,
                rag_results=[
                    cast(
                        DocumentDTO,
                        {k: v for k, v in vector.chunk.items() if k in DocumentDTO.__annotations__ and v is not None},
                    )
                    for vector in vectors
                ],
            ),
        )

        if tool_response["is_sufficient"]:
            has_sufficient_context = True
            break

        logger.info(
            "Guided retrieval response indicated insufficient context",
            reason=tool_response["reason"],
            attempts=attempts,
        )

        search_queries = tool_response["new_queries"]

    if not has_sufficient_context:
        raise EvaluationError("Guided retrieval response indicated insufficient context")

    if rerank:
        vectors = await rerank_vectors(vectors=vectors, queries=search_queries, user_prompt=str(user_prompt))

    logger.info(
        "Successfully retrieved and processed documents",
        organization_id=organization_id,
        application_id=application_id,
        reranking_applied=rerank,
        num_docs=len(vectors),
        attempts=attempts,
    )

    return [
        cast(DocumentDTO, {k: v for k, v in vector.chunk.items() if k in DocumentDTO.__annotations__ and v is not None})
        for vector in vectors[:max_results]
    ]
