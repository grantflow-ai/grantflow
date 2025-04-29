import logging
import sys
from typing import Any, Literal, TypedDict
from uuid import UUID

from litestar import Litestar, post
from litestar.config.cors import CORSConfig
from litestar.logging import StructLoggingConfig
from packages.db.src.connection import get_session_maker
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import GrantApplicationFile, OrganizationFile, RagFile
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import BackendError, DatabaseError
from packages.shared_utils.src.gcs import download_blob
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.server import create_exception_handler, session_maker_provider
from services.indexer.src.files import parse_and_index_file
from sqlalchemy import insert, text, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)

logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)

exception_handler = create_exception_handler(logger)


async def before_server_start(app_instance: Litestar) -> None:
    session_maker = app_instance.state.session_maker = get_session_maker()
    try:
        async with session_maker() as session:
            await session.execute(text("SELECT 1"))

        logger.info("DB connection established.")
    except Exception as e:  # noqa: BLE001
        logger.error("Failed to connect to the database.", exc_info=e)
        sys.exit(1)


class FileIndexingRequest(TypedDict):
    file_path: str
    mime_type: str
    filename: str
    size: int
    parent_id: UUID
    parent_type: Literal["grant_application", "organization"]


class FileIndexingResponse(TypedDict):
    message: str
    file_id: str


@post("/")
async def handle_file_indexing(
    data: FileIndexingRequest,
    session_maker: async_sessionmaker[Any],
) -> FileIndexingResponse:
    bucket_name = get_env("GCS_BUCKET_NAME", fallback="grantflow-uploads")
    async with session_maker() as session, session.begin():
        try:
            file_id = await session.scalar(
                insert(RagFile)
                .values(
                    [
                        {
                            "filename": data["filename"],
                            "mime_type": data["mime_type"],
                            "size": data["size"],
                            "indexing_status": FileIndexingStatusEnum.INDEXING,
                            "bucket_name": bucket_name,
                            "object_path": data["file_path"],
                        }
                    ]
                )
                .returning(RagFile.id)
            )
            if data["parent_type"] == "grant_application":
                await session.execute(
                    insert(GrantApplicationFile).values(
                        {
                            "rag_file_id": file_id,
                            "grant_application_id": data["parent_id"],
                        }
                    )
                )
            else:
                await session.execute(
                    insert(OrganizationFile).values(
                        {
                            "rag_file_id": file_id,
                            "funding_organization_id": data["parent_id"],
                        }
                    )
                )
            logger.info("Created new file record", file_id=file_id, parent_id=data["parent_id"])
        except SQLAlchemyError as e:
            logger.error("Error creating file record", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error creating file record", context=str(e)) from e

    try:
        content = await download_blob(data["file_path"])
        await parse_and_index_file(
            content=content,
            file_id=str(file_id),
            filename=data["filename"],
            mime_type=data["mime_type"],
        )
        logger.info("Successfully indexed file", file_id=file_id)
    except Exception as e:
        async with session_maker() as session, session.begin():
            await session.execute(
                update(RagFile).where(RagFile.id == file_id).values(indexing_status=FileIndexingStatusEnum.FAILED)
            )
        raise BackendError("Error indexing file", context=str(e)) from e

    return FileIndexingResponse(
        message="File indexing successful.",
        file_id=str(file_id),
    )


app = Litestar(
    route_handlers=[
        handle_file_indexing,
    ],
    cors_config=CORSConfig(
        allow_origins=["*"],
        allow_methods=["OPTIONS", "GET", "POST", "PATCH", "DELETE"],
        allow_headers=["*"],
        max_age=86400,
    ),
    on_startup=[before_server_start],
    exception_handlers={SQLAlchemyError: exception_handler, BackendError: exception_handler},
    dependencies={"session_maker": session_maker_provider},
    logging_config=StructLoggingConfig(log_exceptions="always"),
)
