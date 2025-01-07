from asyncio import gather
from http import HTTPStatus
from typing import TYPE_CHECKING, cast

from sanic import BadRequest, InternalServerError
from sanic.request import File as RequestFile
from sanic.response import JSONResponse
from sqlalchemy import insert
from sqlalchemy.exc import SQLAlchemyError

from src.api_types import APIRequest, CreateGrantTemplateRequestBody, TableIdResponse
from src.db.enums import FileIndexingStatusEnum
from src.db.tables import File, FundingOrganization, GrantTemplate, OrganizationFile
from src.dto import FileDTO
from src.exceptions import DatabaseError, ExternalOperationError, FileParsingError, ValidationError
from src.utils.extraction import extract_file_content, extract_webpage_content
from src.utils.logging import get_logger
from src.utils.serialization import deserialize

if TYPE_CHECKING:
    from uuid import UUID

logger = get_logger(__name__)


async def _get_cfp_content(request: APIRequest, request_body: CreateGrantTemplateRequestBody) -> str:
    if request.files and (cfp_file_upload := cast(RequestFile | None, request.files.get("cfp_file"))):
        file = FileDTO.from_file(filename=cfp_file_upload.name, file=cfp_file_upload)
        output, _ = await extract_file_content(
            content=file.content,
            mime_type=file.mime_type,
        )
        return output if isinstance(output, str) else output["content"]
    if cfp_url := request_body.get("cfp_url"):
        return await extract_webpage_content(url=cfp_url)
    raise BadRequest("Either one file or a CFP URL is required")


async def handle_create_grant_template(request: APIRequest) -> JSONResponse:
    """Route handler for creating a grant format.

    Args:
        request: The request object.

    Raises:
        BadRequest: If there are validation failures.
        InternalServerError: If there was an issue creating the grant format.
        DatabaseError: If there was an issue creating the grant format in the database.

    Returns:
        The response object.
    """
    data = cast(str | None, (request.form or {}).get("data"))  # type: ignore[call-overload]
    if not data:
        raise BadRequest("Grant format creation requires a multipart request")

    request_body = deserialize(data, CreateGrantTemplateRequestBody)

    organization_name = request_body.get("funding_organization_name")
    organization_id = request_body.get("funding_organization_id")

    if not organization_id and not organization_name:
        raise BadRequest("Either a funding organization ID or name is required")

    cfp_content = await _get_cfp_content(request=request, request_body=request_body)

    guidelines_files = (
        [FileDTO.from_file(filename=file.name, file=file) for file in request.files.getlist("guidelines_files")]
        if request.files
        else []
    )
    file_ids: list[UUID] = []

    try:
        async with request.ctx.session_maker() as session, session.begin():
            try:
                if not organization_id:
                    organization_id = await session.scalar(
                        insert(FundingOrganization)
                        .values({"name": organization_name})
                        .returning(FundingOrganization.id)
                    )

                if guidelines_files:
                    file_ids = list(
                        await session.scalars(
                            insert(File)
                            .values(
                                [
                                    {
                                        "name": file_dto.filename,
                                        "type": file_dto.mime_type,
                                        "size": len(file_dto.content),
                                        "status": FileIndexingStatusEnum.INDEXING,
                                        "text_content": None,
                                    }
                                    for file_dto in guidelines_files
                                ]
                            )
                            .returning(File.id)
                        )
                    )
                    await session.execute(
                        insert(OrganizationFile).values(
                            [{"funding_organization_id": organization_id, "file_id": file_id} for file_id in file_ids]
                        )
                    )

                grant_template_id = await session.scalar(
                    insert(GrantTemplate)
                    .values({"funding_organization_id": organization_id, "name": "", "template": ""})
                    .returning(GrantTemplate.id)
                )
                await session.commit()
            except SQLAlchemyError as e:
                logger.error("Error inserting new records", exc_info=e)
                await session.rollback()
                raise DatabaseError("Error inserting new records") from e

        signals = [
            request.app.dispatch(
                "handle_generate_grant_template",
                context={
                    "organization_id": str(organization_id),
                    "grant_template_id": str(grant_template_id),
                    "cfp_content": cfp_content,
                },
            ),
            *[
                request.app.dispatch(
                    "parse_and_index_file",
                    context={
                        "file_id": file_id,
                        "file_dto": file_dto,
                    },
                )
                for file_dto, file_id in zip(guidelines_files, file_ids, strict=True)
            ],
        ]
        await gather(*signals)

        return JSONResponse(TableIdResponse(id=str(grant_template_id)), status=HTTPStatus.CREATED)
    except (FileParsingError, ValidationError, ExternalOperationError) as e:
        logger.error("Error creating grant template", exc_info=e)
        raise InternalServerError(str(e)) from e
