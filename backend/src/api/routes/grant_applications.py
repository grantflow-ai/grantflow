from typing import Annotated, Any
from uuid import UUID

from litestar import delete, get, patch, post
from litestar.datastructures import UploadFile
from litestar.enums import RequestEncodingType
from litestar.exceptions import ValidationException
from litestar.params import Body
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from src.api.api_types import (
    APIRequest,
    ApplicationDraftCompleteResponse,
    ApplicationDraftProcessingResponse,
    ApplicationResponse,
    BaseApplicationResponse,
    CreateApplicationRequestBody,
    FundingOrganizationResponse,
    GrantTemplateResponse,
    TableIdResponse,
    UpdateApplicationRequestBody,
)
from src.db.enums import UserRoleEnum
from src.db.tables import GrantApplication
from src.exceptions import DatabaseError
from src.files import FileDTO
from src.utils.db import retrieve_application
from src.utils.logger import get_logger

logger = get_logger(__name__)

PROCESSING_SLEEP_INTERVAL = 15  # seconds ~keep


async def _get_cfp_content(cfp_file_upload: UploadFile | None, cfp_url: str | None) -> str:
    from src.utils.extraction import extract_file_content, extract_webpage_content

    if cfp_file_upload:
        file = await FileDTO.from_file(filename=cfp_file_upload.filename, file=cfp_file_upload)
        output, _ = await extract_file_content(
            content=file.content,
            mime_type=file.mime_type,
        )
        return output if isinstance(output, str) else output["content"]
    if cfp_url:
        return await extract_webpage_content(url=cfp_url)
    raise ValidationException("Either one file or a CFP URL is required")


@post(
    "/workspaces/{workspace_id:uuid}/applications",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="CreateApplication",
)
async def handle_create_application(
    data: Annotated[CreateApplicationRequestBody, Body(media_type=RequestEncodingType.MULTI_PART)],
    request: APIRequest,
    workspace_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> TableIdResponse:
    logger.info("Creating application for workspace", workspace_id=workspace_id)

    cfp_content = await _get_cfp_content(
        cfp_file_upload=data.get("cfp_file"),
        cfp_url=data.get("cfp_url"),
    )

    async with session_maker() as session, session.begin():
        try:
            application_id = await session.scalar(
                insert(GrantApplication)
                .values({"workspace_id": workspace_id, "title": data["title"]})
                .returning(GrantApplication.id)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error creating application", exc_info=e)
            raise DatabaseError("Error creating application", context=str(e)) from e

    request.app.emit(
        "handle_generate_grant_template",
        application_id=application_id,
        cfp_content=cfp_content,
    )

    return TableIdResponse(id=str(application_id))


@get(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="GetApplication",
)
async def handle_retrieve_application(
    workspace_id: UUID,
    application_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> ApplicationResponse:
    logger.info("Retrieving applications for workspace", workspace_id=workspace_id)
    application = await retrieve_application(session_maker=session_maker, application_id=application_id)
    return ApplicationResponse(
        id=str(application.id),
        title=application.title,
        completed_at=application.completed_at.isoformat() if application.completed_at else None,
        text=application.text,
        form_inputs=application.form_inputs,
        research_objectives=application.research_objectives,
        grant_template=GrantTemplateResponse(
            grant_sections=application.grant_template.grant_sections,
            funding_organization=FundingOrganizationResponse(
                id=str(application.grant_template.funding_organization.id),
                full_name=application.grant_template.funding_organization.full_name,
                abbreviation=application.grant_template.funding_organization.abbreviation,
            )
            if application.grant_template.funding_organization
            else None,
        )
        if application.grant_template
        else None,
    )


@patch(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="UpdateApplication",
)
async def handle_update_application(
    data: UpdateApplicationRequestBody, application_id: UUID, session_maker: async_sessionmaker[Any]
) -> BaseApplicationResponse:
    logger.info("Updating application", application_id=application_id)

    if not data:
        raise ValidationException("Request body cannot be empty")

    async with session_maker() as session, session.begin():
        try:
            update_values = dict(data)
            await session.execute(
                update(GrantApplication).where(GrantApplication.id == application_id).values(update_values)
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error updating application", exc_info=e)
            raise DatabaseError("Error updating application", context=str(e)) from e

    application = await retrieve_application(session_maker=session_maker, application_id=application_id)
    return BaseApplicationResponse(
        id=str(application.id),
        title=application.title,
        completed_at=application.completed_at.isoformat() if application.completed_at else None,
    )


@delete(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="DeleteApplication",
)
async def handle_delete_application(application_id: UUID, session_maker: async_sessionmaker[Any]) -> None:
    logger.info("Deleting application", application_id=application_id)

    async with session_maker() as session, session.begin():
        try:
            await session.execute(sa_delete(GrantApplication).where(GrantApplication.id == application_id))
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            logger.error("Error deleting application", exc_info=e)
            raise DatabaseError("Error deleting application", context=str(e)) from e


@get(
    "/workspaces/{workspace_id:uuid}/applications/{application_id:uuid}/content",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER],
    operation_id="GetApplicationContent",
)
async def handle_retrieve_application_text(
    application_id: UUID, session_maker: async_sessionmaker[Any]
) -> ApplicationDraftCompleteResponse | ApplicationDraftProcessingResponse:
    logger.info("handling polling request for application", application_id=application_id)
    async with session_maker() as session:
        grant_application: GrantApplication = await session.scalar(
            select(GrantApplication)
            .options(selectinload(GrantApplication.grant_template))
            .where(GrantApplication.id == application_id)
            .where(GrantApplication.text.is_not(None))
        )

    if grant_application and grant_application.text:
        return ApplicationDraftCompleteResponse(id=str(application_id), status="complete", text=grant_application.text)

    return ApplicationDraftProcessingResponse(id=str(application_id), status="generating")
