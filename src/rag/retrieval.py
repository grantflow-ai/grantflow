from typing import Any, Final, cast

from sqlalchemy import select

from src.db.connection import get_session_maker
from src.db.tables import GrantApplicationFile, OrganizationFile, RagFile, TextVector
from src.rag.dto import DocumentDTO
from src.rag.search_queries import handle_create_search_queries
from src.utils.embeddings import TaskType, generate_embeddings
from src.utils.logging import get_logger

logger = get_logger(__name__)

MAX_RESULTS: Final[int] = 25


async def retrieve_documents(
    *,
    application_id: str | None = None,
    max_results: int = MAX_RESULTS,
    organization_id: str | None = None,
    task_description: str,
    **inputs: Any,
) -> list[DocumentDTO]:
    """Retrieve documents from the vector store.

    Args:
        application_id: The application ID, required if organization_id is not provided.
        max_results: The maximum number of results to return.
        organization_id: The organization ID, required if application_id is not provided.
        task_description: The task description.
        **inputs: The inputs to the task.

    Raises:
        ValueError: If neither application_id nor organization_id is provided.

    Returns:
        list[dict[str, str]]: The retrieved documents.
    """
    if not application_id and not organization_id:
        raise ValueError("Either application_id or organization_id must be provided.")

    file_table_cls = GrantApplicationFile if application_id else OrganizationFile

    search_queries = await handle_create_search_queries(task_description=task_description, **inputs)
    query_embeddings = await generate_embeddings(",".join(search_queries), TaskType.RetrievalQuery)

    session_maker = get_session_maker()
    async with session_maker() as session:
        result = await session.scalars(
            select(TextVector)
            .join(RagFile, TextVector.rag_file_id == RagFile.id)
            .join(file_table_cls, RagFile.id == file_table_cls.rag_file_id)
            .where(
                file_table_cls.grant_application_id == application_id
                if hasattr(file_table_cls, "grant_application_id")
                else file_table_cls.funding_organization_id == organization_id
            )
            .order_by(TextVector.embedding.cosine_distance(query_embeddings))
            .limit(max_results)
        )

    output: list[DocumentDTO] = cast(
        list[DocumentDTO],
        [{k: v for k, v in row.chunk.items() if k in DocumentDTO.__annotations__ and v is not None} for row in result],
    )

    logger.info(
        "Successfully retrieved documents from vector store",
        organization_id=organization_id,
        application_id=application_id,
    )
    return output
