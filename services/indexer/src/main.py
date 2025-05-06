from typing import Any, TypedDict, cast

from litestar import post
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplicationRagSource,
    GrantTemplateRagSource,
    OrganizationRagSource,
    RagFile,
    RagSource,
    RagUrl,
)
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.server import create_litestar_app
from services.indexer.src.processing import process_source
from services.indexer.src.pubsub import PubSubEvent, handle_pubsub_message
from sqlalchemy import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class FileIndexingResponse(TypedDict):
    message: str
    source_id: str


@post("/")
async def handle_file_indexing(
    data: PubSubEvent,
    session_maker: async_sessionmaker[Any],
) -> None:
    message = await handle_pubsub_message(data)
    parent_id = message.pop("parent_id")  # type: ignore[misc]
    parent_type = message.pop("parent_type")  # type: ignore[misc]
    source_type = message.pop("source_type")  # type: ignore[misc]
    content = message.pop("content")  # type: ignore[misc]
    async with session_maker() as session, session.begin():
        try:
            # First create the base RagSource record
            source_id = await session.scalar(
                insert(RagSource)
                .values(
                    [
                        {
                            "indexing_status": FileIndexingStatusEnum.INDEXING,
                            "type": "rag_file",  # Set polymorphic identity
                        }
                    ]
                )
                .returning(RagSource.id)
            )

            if source_type == "url":
                # we are dealing with a URL indexing request
                await session.execute(
                    insert(RagUrl).values(
                        [
                            {
                                "id": source_id,
                                "text_content": content,
                                **message,
                            }
                        ]
                    )
                )
            else:
                await session.execute(
                    insert(RagFile)
                    .values(
                        [
                            {
                                "id": source_id,
                                "content": content,
                                **message,
                            }
                        ]
                    )
                    .returning(RagFile.id)
                )

            if parent_type == "grant_application":
                await session.execute(
                    insert(GrantApplicationRagSource).values(
                        {
                            "rag_source_id": source_id,
                            "grant_application_id": parent_id,
                        }
                    )
                )
            elif parent_type == "funding_organization":
                await session.execute(
                    insert(OrganizationRagSource).values(
                        {
                            "rag_source_id": source_id,
                            "funding_organization_id": parent_id,
                        }
                    )
                )
            else:
                await session.execute(
                    insert(GrantTemplateRagSource).values(
                        {
                            "rag_source_id": source_id,
                            "grant_template_id": parent_id,
                        }
                    )
                )
            logger.info("Created new file record", source_id=source_id, parent_type=parent_type, parent_id=parent_id)
        except SQLAlchemyError as e:
            logger.error("Error creating file record", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error creating file record", context=str(e)) from e

    await process_source(
        content=content,
        source_id=str(source_id),
        filename=cast("str", message.get("filename", "")),
        mime_type=cast("str", message.get("mime_type", "text/markdown")),
    )
    logger.info("Successfully indexed file", source_id=source_id)


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_file_indexing,
    ],
)
