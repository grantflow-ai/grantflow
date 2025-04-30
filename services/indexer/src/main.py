from typing import Any, TypedDict

from kreuzberg._mime_types import EXT_TO_MIME_TYPE
from litestar import post
from litestar.exceptions import ValidationException
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import GrantApplicationFile, GrantTemplateFile, OrganizationFile, RagFile
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.gcs import download_blob
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.server import create_litestar_app
from services.indexer.src.files import parse_and_index_file
from sqlalchemy import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class FileIndexingRequest(TypedDict):
    file_path: str


class FileIndexingResponse(TypedDict):
    message: str
    file_id: str


@post("/")
async def handle_file_indexing(
    data: FileIndexingRequest,
    session_maker: async_sessionmaker[Any],
) -> FileIndexingResponse:
    try:
        # parent_type is one of "grant_application", "funding_organization", or "grant_template"
        # parent_id is a UUID string of the parent entity
        # the filename is a discrete filename with extension
        parent_type, parent_id, filename = data["file_path"].split("/")
        file_extension = filename.split(".")[-1]
        mime_type = EXT_TO_MIME_TYPE[file_extension]
    except ValueError as e:
        raise ValidationException(
            "Invalid file path format. Expected format: <parent_type>/<parent_id>/<filename>.<extension>",
        ) from e
    except KeyError as e:
        raise ValidationException(
            f"Unsupported file extension: {data['file_path'].split('.')[-1]}. Supported extensions are: {', '.join(EXT_TO_MIME_TYPE.keys())}",
        ) from e

    content = await download_blob(data["file_path"])
    bucket_name = get_env("GCS_BUCKET_NAME", fallback="grantflow-uploads")

    async with session_maker() as session, session.begin():
        try:
            file_id = await session.scalar(
                insert(RagFile)
                .values(
                    [
                        {
                            "filename": filename,
                            "mime_type": mime_type,
                            "size": len(content),
                            "indexing_status": FileIndexingStatusEnum.INDEXING,
                            "bucket_name": bucket_name,
                            "object_path": data["file_path"],
                        }
                    ]
                )
                .returning(RagFile.id)
            )
            if parent_type == "grant_application":
                await session.execute(
                    insert(GrantApplicationFile).values(
                        {
                            "rag_file_id": file_id,
                            "grant_application_id": parent_id,
                        }
                    )
                )
            elif parent_type == "funding_organization":
                await session.execute(
                    insert(OrganizationFile).values(
                        {
                            "rag_file_id": file_id,
                            "funding_organization_id": parent_id,
                        }
                    )
                )
            else:
                await session.execute(
                    insert(GrantTemplateFile).values(
                        {
                            "rag_file_id": file_id,
                            "grant_template_id": parent_id,
                        }
                    )
                )
            logger.info("Created new file record", file_id=file_id, parent_type=parent_type, parent_id=parent_id)
        except SQLAlchemyError as e:
            logger.error("Error creating file record", exc_info=e)
            await session.rollback()
            raise DatabaseError("Error creating file record", context=str(e)) from e

    await parse_and_index_file(
        content=content,
        file_id=str(file_id),
        filename=filename,
        mime_type=mime_type,
    )
    logger.info("Successfully indexed file", file_id=file_id)

    return FileIndexingResponse(
        message="File indexing successful.",
        file_id=str(file_id),
    )


app = create_litestar_app(
    logger=logger,
    route_handlers=[
        handle_file_indexing,
    ],
)
