import logging
import sys
from typing import Any
from uuid import UUID

from sanic import BadRequest, HTTPResponse, Sanic, empty
from sqlalchemy import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api.utils import verify_workspace_access
from src.api_types import APIRequest
from src.db.tables import ApplicationFile, ApplicationVector
from src.dto import FileDTO, VectorDTO
from src.exceptions import BackendError, DatabaseError
from src.indexer import parse_and_index_file

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger(__name__)


async def insert_file_data(
    *, session_maker: async_sessionmaker[Any], application_id: UUID, vectors_lists: list[VectorDTO], file_dto: FileDTO
) -> None:
    """Insert the file data into the database.

    Args:
        session_maker: The session maker.
        application_id: The application ID.
        vectors_lists: The vectors to insert.
        file_dto: The file DTO.

    Raises:
        DatabaseError: If there is an error inserting the data.
    """
    async with session_maker() as session:
        try:
            application = await session.scalar(
                insert(ApplicationFile)
                .values(
                    [
                        {
                            "application_id": application_id,
                            "name": file_dto.filename,
                            "type": file_dto.mime_type,
                            "size": len(file_dto.content),
                        }
                    ]
                )
                .returning(ApplicationFile)
            )

            await session.execute(
                insert(ApplicationVector).values(
                    [
                        {
                            "application_id": application_id,
                            "file_id": application.id,
                            "chunk_index": vector_dto.chunk_index,
                            "content": vector_dto.content,
                            "element_type": vector_dto.element_type,
                            "embedding": vector_dto.embedding,
                            "page_number": vector_dto.page_number,
                        }
                        for vector_dto in vectors_lists
                    ]
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            raise DatabaseError("Error inserting application files data") from e


async def handle_upload_application_file(request: APIRequest, workspace_id: UUID, application_id: UUID) -> HTTPResponse:
    """Handle the upload of a files.

    Args:
        request: APIRequest: The request object.
        workspace_id: UUID: The workspace ID.
        application_id: UUID: The application ID.

    Raises:
        BadRequest: If no files are provided or more than 1 file is provided.

    Returns:
        The response object.
    """
    await verify_workspace_access(request=request, workspace_id=workspace_id)

    file_dtos: list[FileDTO] = [
        FileDTO.from_file(filename=filename, file=files_list)
        for filename, files_list in dict(request.files).items()  # type: ignore[arg-type]
        if files_list
    ]

    if not file_dtos:
        logger.error("No files provided")
        raise BadRequest("No files provided")

    if len(file_dtos) > 1:
        logger.error("Only one file should be provided")
        raise BadRequest("Only one file should be provided")

    request.app.add_task(
        file_parsing_task(
            app=request.app,
            file_dto=file_dtos[0],
            application_id=application_id,
            session_maker=request.ctx.session_maker,
        ),
        name=f"file_parsing_task-{application_id}-{file_dtos[0].filename}",
    )
    return empty()


async def file_parsing_task(
    app: Sanic[Any, Any], file_dto: FileDTO, application_id: UUID, session_maker: async_sessionmaker[Any]
) -> None:
    """Parse and index the given file.

    Args:
        app: The application object.
        file_dto: The file to parse and index.
        application_id: The application ID.
        session_maker: The session maker.

    Returns:
        The list of vectors.
    """
    try:
        vectors_lists = await parse_and_index_file(file=file_dto)
        await insert_file_data(
            application_id=application_id, vectors_lists=vectors_lists, file_dto=file_dto, session_maker=session_maker
        )
    except BackendError as e:
        logger.error("Error parsing and indexing file: %s", e)
        await app.cancel_task(f"file_parsing_task-{application_id}-{file_dto.filename}")
