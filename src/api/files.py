import logging
import sys
from asyncio import gather
from http import HTTPStatus
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


async def handle_upload_application_files(
    request: APIRequest, workspace_id: UUID, application_id: UUID
) -> HTTPResponse:
    """Route handler for uploading file_dtos to the indexer.

    Args:
        request: The request object.
        workspace_id: The workspace ID.
        application_id: The application ID.

    Raises:
        BadRequest: If no file_dtos are provided.

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
        logger.error("No file_dtos provided")
        raise BadRequest("No file_dtos provided")

    results: list[list[VectorDTO] | ValidationError | FileParsingError | ExternalOperationError] = await gather(
        *[
            parse_and_index_file(
                file_dto,
            )
            for file_dto in file_dtos
        ]
    )

    results_and_files = list(zip(results, file_dtos))

    file_data: list[tuple[list[VectorDTO], FileDTO]] = [
        result for result in results_and_files if isinstance(result[0], list)
    ]
    if file_data:
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
                            for _, file_dto in file_data
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
                            for (vector_dto_list, _), file_id in zip(file_data, file_ids, strict=False)
                            for vector_dto in vector_dto_list
                        ]
                    )
                )
                await session.commit()
            except SQLAlchemyError as e:
                await session.rollback()
                raise DatabaseError("Error inserting application files data") from e

    errors_mapping: dict[str, str] = {}

    for error, file_dto in [
        result
        for result in results_and_files
        if isinstance(result[0], ValidationError | FileParsingError | ExternalOperationError)
    ]:
        errors_mapping[file_dto.filename] = str(error)

    return json(
        errors_mapping,
        status=HTTPStatus.CREATED,
    )
