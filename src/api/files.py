import logging
import sys
from asyncio import gather
from http import HTTPStatus
from typing import cast
from uuid import UUID

from sanic import BadRequest, HTTPResponse, json
from sqlalchemy import insert
from sqlalchemy.exc import SQLAlchemyError

from src.api.utils import verify_workspace_access
from src.api_types import APIRequest
from src.db.tables import ApplicationFile, ApplicationVector
from src.dto import FileDTO, VectorDTO
from src.exceptions import DatabaseError, ExternalOperationError, FileParsingError, ValidationError
from src.indexer import parse_and_index_file

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
logger = logging.getLogger(__name__)


async def insert_file_data(
    *, request: APIRequest, application_id: UUID, vectors_and_files: list[tuple[list[VectorDTO], FileDTO]]
) -> None:
    """Insert the file data into the database.

    Args:
        request: The request object.
        application_id: The application ID.
        vectors_and_files: The file data to insert.

    Raises:
        DatabaseError: If there is an error inserting the data.
    """
    async with request.ctx.session_maker() as session:
        try:
            result = await session.execute(
                insert(ApplicationFile)
                .values(
                    [
                        {
                            "application_id": application_id,
                            "name": file_dto.filename,
                            "type": file_dto.mime_type,
                            "size": len(file_dto.content),
                        }
                        for _, file_dto in vectors_and_files
                    ]
                )
                .returning(ApplicationFile.id)
            )

            file_ids = result.scalars().all()
            await session.execute(
                insert(ApplicationVector).values(
                    [
                        {
                            "application_id": application_id,
                            "file_id": file_id,
                            "chunk_index": vector_dto.chunk_index,
                            "content": vector_dto.content,
                            "element_type": vector_dto.element_type,
                            "embedding": vector_dto.embedding,
                            "page_number": vector_dto.page_number,
                        }
                        for (vector_dto_list, _), file_id in zip(vectors_and_files, file_ids, strict=False)
                        for vector_dto in vector_dto_list
                    ]
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            raise DatabaseError("Error inserting application files data") from e


async def handle_upload_application_files(
    request: APIRequest, workspace_id: UUID, application_id: UUID
) -> HTTPResponse:
    """Handle the upload of application files.

    request: APIRequest: The request object.
    workspace_id: UUID: The workspace ID.
    application_id: UUID: The application ID.

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

    results: list[list[VectorDTO] | ValidationError | FileParsingError | ExternalOperationError] = await gather(
        *[
            parse_and_index_file(
                file_dto,
            )
            for file_dto in file_dtos
        ]
    )

    results_and_files = list(zip(results, file_dtos, strict=True))

    if vectors_and_files := cast(
        list[tuple[list[VectorDTO], FileDTO]], [result for result in results_and_files if isinstance(result[0], list)]
    ):
        await insert_file_data(request=request, application_id=application_id, vectors_and_files=vectors_and_files)

    data = {}
    if error_results := cast(
        list[tuple[ValidationError | FileParsingError | ExternalOperationError, FileDTO]],
        [
            result
            for result in results_and_files
            if isinstance(result[0], (ValidationError | FileParsingError | ExternalOperationError))
        ],
    ):
        data["errors"] = {file_dto.filename: str(error) for error, file_dto in error_results}

    return json(data, status=HTTPStatus.OK)
