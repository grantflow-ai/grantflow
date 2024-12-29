from asyncio import gather
from http import HTTPStatus
from typing import cast

from sanic import BadRequest, json
from sanic.response import JSONResponse
from sqlalchemy import insert
from sqlalchemy.exc import SQLAlchemyError

from src.api_types import APIRequest, CreateGrantFormatRequestBody, TableIdResponse
from src.db.enums import FileIndexingStatusEnum
from src.db.tables import GrantFormat, GrantFormatFile
from src.exceptions import DatabaseError
from src.indexer.dto import FileDTO
from src.utils.logging import get_logger
from src.utils.serialization import deserialize

logger = get_logger(__name__)


async def handle_create_grant_format(request: APIRequest) -> JSONResponse:
    """Route handler for creating a grant format.

    Args:
        request: The request object.

    Raises:
        DatabaseError: If there was an issue creating the application in the database.
        BadRequest: If the request is not a multipart request.

    Returns:
        The response object.
    """
    data = cast(str | None, (request.form or {}).get("data"))  # type: ignore[call-overload]

    if not data:
        raise BadRequest("Grant format creation requires a multipart request")

    uploaded_files: list[FileDTO] = [
        FileDTO.from_file(filename=filename, file=files_list)
        for filename, files_list in dict(request.files or {}).items()
        if files_list
    ]

    if not uploaded_files:
        raise BadRequest("No files uploaded")

    request_body = deserialize(data, CreateGrantFormatRequestBody)
    logger.info("Creating grant format")

    async with request.ctx.session_maker() as session, session.begin():
        try:
            result = await session.execute(
                insert(GrantFormat)
                .values(
                    {
                        "name": request_body["name"],
                        "markdown_template": "",
                    }
                )
                .returning(GrantFormat.id)
            )
            format_id = result.scalar_one()

            file_ids = await session.scalars(
                insert(GrantFormatFile)
                .values(
                    [
                        {
                            "format_id": format_id,
                            "name": file_dto.filename,
                            "type": file_dto.mime_type,
                            "size": file_dto.content.__sizeof__(),
                            "status": FileIndexingStatusEnum.INDEXING,
                        }
                        for file_dto in uploaded_files
                    ]
                )
                .returning(GrantFormatFile.id)
            )

            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating grant format", exc_info=e)
            raise DatabaseError("Error grant format", context=str(e)) from e

        logger.info("Dispatching signal to parse and index files")
        await gather(
            *[
                request.app.dispatch(
                    "parse_and_index_file",
                    context={
                        "format_id": format_id,
                        "file_id": file_id,
                        "file_dto": file_dto,
                    },
                )
                for file_dto, file_id in zip(uploaded_files, file_ids, strict=False)
            ]
        )

    logger.info("Dispatching signal to generate grant format draft")
    await request.app.dispatch(
        "generate_grant_format",
        context={"format_id": format_id},
    )

    return json(
        TableIdResponse(
            id=str(format_id),
        ),
        status=HTTPStatus.CREATED,
    )
