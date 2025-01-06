from asyncio import gather
from typing import cast

from sanic import BadRequest, InternalServerError
from sanic.request import File
from sanic.response import JSONResponse
from sqlalchemy import insert
from sqlalchemy.exc import SQLAlchemyError

from src.api_types import APIRequest, CreateGrantTemplateRequestBody
from src.db.enums import FileIndexingStatusEnum
from src.db.tables import FundingOrganization, GrantGuidelinesFile
from src.dto import FileDTO
from src.exceptions import DatabaseError, ExternalOperationError, FileParsingError, ValidationError
from src.utils.extraction import extract_file_content, extract_webpage_content
from src.utils.logging import get_logger
from src.utils.serialization import deserialize

logger = get_logger(__name__)


async def handle_create_grant_format(request: APIRequest) -> JSONResponse:
    """Route handler for creating a grant format.

    Args:
        request: The request object.

    Raises:
        BadRequest: If there are validation failures.
        InternalServerError: If there was an issue creating the grant format.

    Returns:
        The response object.
    """
    data = cast(str | None, (request.form or {}).get("data"))  # type: ignore[call-overload]
    if not data:
        raise BadRequest("Grant format creation requires a multipart request")

    request_body = deserialize(data, CreateGrantTemplateRequestBody)
    funding_organization_name = request_body.get("")

    source: str | FileDTO = ""
    if cfp_file_upload := cast(File | None, request.files.get("cfp_file")):
        source = FileDTO.from_file(filename=cfp_file_upload.name, file=cfp_file_upload)
    elif cfp_url := request_body.get("cfp_url"):
        source = cfp_url
    else:
        raise BadRequest("Either one file or a CFP URL is required")

    if "funding_organization_id" in request_body:
        organization_id = request_body["funding_organization_id"]
    elif "funding_organization_name" in request_body:
        async with request.ctx.session_maker() as session, session.begin():
            try:
                organization_id = await session.scalar(
                    insert(FundingOrganization)
                    .values({"name": funding_organization_name})
                    .returning(FundingOrganization.id)
                )
                await session.commit()
            except SQLAlchemyError as e:
                logger.error("Error creating funding organization", exc_info=e)
                await session.rollback()
                raise DatabaseError("Error creating funding organization") from e
    else:
        raise BadRequest("Funding organization ID or name is required")

    if guidelines_files := [
        FileDTO.from_file(filename=file.name, file=file) for file in request.files.getlist("guidelines_files")
    ]:
        async with request.ctx.session_maker() as session, session.begin():
            try:
                file_ids = await session.scalars(
                    insert(GrantGuidelinesFile)
                    .values(
                        [
                            {
                                "funding_organization_id": organization_id,
                                "name": file_dto.filename,
                                "type": file_dto.mime_type,
                                "size": file_dto.content.__sizeof__(),
                                "status": FileIndexingStatusEnum.INDEXING,
                            }
                            for file_dto in guidelines_files
                        ]
                    )
                    .returning(GrantGuidelinesFile.id)
                )
                await session.commit()
            except SQLAlchemyError as e:
                logger.error("Error creating guidelines files", exc_info=e)
                await session.rollback()
                raise DatabaseError("Error creating guidelines files") from e

        logger.info("Dispatching signal to parse and index files")
        await gather(
            *[
                request.app.dispatch(
                    "parse_and_index_file",
                    context={
                        "organization_id": organization_id,
                        "file_id": file_id,
                        "file_dto": file_dto,
                    },
                )
                for file_dto, file_id in zip(guidelines_files, file_ids, strict=False)
            ]
        )
    try:
        if isinstance(source, str):
            cfp_content = await extract_webpage_content(url=source)
        else:
            output, _ = await extract_file_content(
                content=source.content,
                mime_type=source.mime_type,
            )
            cfp_content = output if isinstance(output, str) else output["content"]

        logger.info("Creating grant template", cfp_content=cfp_content)
    except (FileParsingError, ValidationError, ExternalOperationError) as e:
        logger.error("Error creating grant template", exc_info=e)
        raise InternalServerError(str(e)) from e
