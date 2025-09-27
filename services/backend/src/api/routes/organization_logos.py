from typing import Any, TypedDict
from uuid import UUID

from litestar import delete, post
from litestar.datastructures import UploadFile
from litestar.exceptions import ValidationException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import update
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.common_types import APIRequest
from services.backend.src.utils.logo_gcs import (
    LOGO_MIME_TYPES,
    create_signed_logo_upload_url,
    delete_organization_logo,
    get_logo_url,
    upload_organization_logo,
)

logger = get_logger(__name__)


class LogoUploadResponse(TypedDict):
    logo_url: str


class LogoUploadUrlResponse(TypedDict):
    upload_url: str
    logo_url: str


@post(
    "/organizations/{organization_id:uuid}/logo/upload-url",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    status_code=200,
)
async def handle_create_logo_upload_url(
    organization_id: UUID,
    content_type: str,
) -> LogoUploadUrlResponse:
    """Create a signed URL for direct logo upload to GCS."""
    try:
        upload_url = await create_signed_logo_upload_url(organization_id=organization_id, content_type=content_type)

        # Determine the expected logo URL after upload
        file_extension = LOGO_MIME_TYPES[content_type]
        expected_logo_url = get_logo_url(organization_id, file_extension)

        return LogoUploadUrlResponse(upload_url=upload_url, logo_url=expected_logo_url)

    except ValidationError as e:
        raise ValidationException(str(e)) from e


@post(
    "/organizations/{organization_id:uuid}/logo",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    status_code=200,
)
async def handle_upload_organization_logo(
    request: APIRequest,
    session_maker: async_sessionmaker[Any],
    organization_id: UUID,
) -> LogoUploadResponse:
    """Upload organization logo via multipart form data."""
    # Get file from request
    form_data = await request.form()
    logo_file = form_data.get("logo")

    if not logo_file or not isinstance(logo_file, UploadFile):
        raise ValidationException("No logo file provided")

    if not logo_file.content_type:
        raise ValidationException("Content-Type header is required for logo files")

    if logo_file.content_type not in LOGO_MIME_TYPES:
        raise ValidationException(
            f"Unsupported file type: {logo_file.content_type}. Supported types: {', '.join(LOGO_MIME_TYPES.keys())}"
        )

    try:
        file_content = await logo_file.read()
        content_type = logo_file.content_type

        # Upload to GCS
        logo_url = await upload_organization_logo(
            organization_id=organization_id, file_content=file_content, content_type=content_type
        )

        # Update organization record
        async with session_maker() as session, session.begin():
            await session.execute(
                update(Organization)
                .where(Organization.id == organization_id, Organization.deleted_at.is_(None))
                .values(logo_url=logo_url)
            )

        logger.info(
            "Organization logo uploaded and database updated", organization_id=str(organization_id), logo_url=logo_url
        )

        return LogoUploadResponse(logo_url=logo_url)

    except ValidationError as e:
        logger.warning("Logo upload validation failed", organization_id=str(organization_id), error=str(e))
        raise ValidationException(str(e)) from e


@delete(
    "/organizations/{organization_id:uuid}/logo",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    status_code=204,
)
async def handle_delete_organization_logo(
    session_maker: async_sessionmaker[Any],
    organization_id: UUID,
) -> None:
    """Delete organization logo."""
    # Delete from GCS
    await delete_organization_logo(organization_id)

    # Update organization record
    async with session_maker() as session, session.begin():
        result = await session.execute(
            update(Organization)
            .where(Organization.id == organization_id, Organization.deleted_at.is_(None))
            .values(logo_url=None)
        )

        if result.rowcount == 0:
            raise ValidationException("Organization not found")

    logger.info("Organization logo deleted", organization_id=str(organization_id))
