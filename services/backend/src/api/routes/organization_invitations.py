from datetime import UTC, datetime, timedelta
from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import delete, get, patch, post
from litestar.exceptions import ValidationException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization, OrganizationInvitation, OrganizationUser
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.common_types import APIRequest
from services.backend.src.utils.audit import log_organization_audit_from_request
from services.backend.src.utils.jwt import create_jwt

logger = get_logger(__name__)


CREATE_INVITATION = "create_invitation"
UPDATE_INVITATION = "update_invitation"
DELETE_INVITATION = "delete_invitation"


class CreateOrganizationInvitationRequestBody(TypedDict):
    email: str
    role: UserRoleEnum
    has_all_projects_access: NotRequired[bool]
    project_ids: NotRequired[list[str]]


class UpdateOrganizationInvitationRequestBody(TypedDict):
    role: NotRequired[UserRoleEnum]


class OrganizationInvitationResponse(TypedDict):
    id: str
    email: str
    role: UserRoleEnum
    invitation_sent_at: str
    accepted_at: str | None


class InvitationTokenResponse(TypedDict):
    token: str
    expires_at: str


@get(
    "/organizations/{organization_id:uuid}/invitations",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="ListOrganizationInvitations",
)
async def handle_list_organization_invitations(
    request: APIRequest,
    organization_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> list[OrganizationInvitationResponse]:
    # Listing organization invitations

    async with session_maker() as session:
        organization = await session.scalar(
            select(Organization).where(Organization.id == organization_id).where(Organization.deleted_at.is_(None))
        )
        if not organization:
            raise ValidationException("Organization not found")

        invitations = list(
            await session.scalars(
                select(OrganizationInvitation)
                .where(OrganizationInvitation.organization_id == organization_id)
                .where(OrganizationInvitation.deleted_at.is_(None))
            )
        )

    return [
        OrganizationInvitationResponse(
            id=str(invitation.id),
            email=invitation.email,
            role=invitation.role,
            invitation_sent_at=invitation.invitation_sent_at.isoformat(),
            accepted_at=invitation.accepted_at.isoformat() if invitation.accepted_at else None,
        )
        for invitation in invitations
    ]


@post(
    "/organizations/{organization_id:uuid}/invitations",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="CreateOrganizationInvitation",
)
async def handle_create_organization_invitation(
    request: APIRequest,
    organization_id: UUID,
    data: CreateOrganizationInvitationRequestBody,
    session_maker: async_sessionmaker[Any],
) -> InvitationTokenResponse:
    # Creating organization invitation

    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(
                select(Organization).where(Organization.id == organization_id).where(Organization.deleted_at.is_(None))
            )
            if not organization:
                raise ValidationException("Organization not found")

            existing_invitation = await session.scalar(
                select(OrganizationInvitation)
                .where(OrganizationInvitation.organization_id == organization_id)
                .where(OrganizationInvitation.email == data["email"])
                .where(OrganizationInvitation.deleted_at.is_(None))
            )
            if existing_invitation:
                raise ValidationException("Invitation already exists for this email")

            inviter = await session.scalar(
                select(OrganizationUser)
                .where(OrganizationUser.organization_id == organization_id)
                .where(OrganizationUser.firebase_uid == request.auth)
                .where(OrganizationUser.deleted_at.is_(None))
            )
            if not inviter:
                raise ValidationException("Inviter not found in organization")

            if inviter.role == UserRoleEnum.ADMIN and data["role"] == UserRoleEnum.OWNER:
                raise ValidationException("Admin cannot invite users as Owner")

            invitation_data = {
                "organization_id": organization_id,
                "email": data["email"],
                "role": data["role"],
                "invitation_sent_at": datetime.now(UTC),
            }

            invitation = await session.scalar(
                insert(OrganizationInvitation).values(invitation_data).returning(OrganizationInvitation)
            )

            token = create_jwt(
                firebase_uid=f"invitation:{invitation.id}",
                ttl=timedelta(hours=72),
            )

            await log_organization_audit_from_request(
                session=session,
                request=request,
                organization_id=organization_id,
                action=CREATE_INVITATION,
                details={
                    "email": data["email"],
                    "role": data["role"].value,
                    "invitation_id": str(invitation.id),
                },
            )

            await session.commit()

            expires_at = datetime.now(UTC) + timedelta(hours=72)
            return InvitationTokenResponse(
                token=token,
                expires_at=expires_at.isoformat(),
            )

        except SQLAlchemyError as e:
            logger.error("Error creating organization invitation", exc_info=e)
            raise DatabaseError("Error creating organization invitation", context=str(e)) from e


@patch(
    "/organizations/{organization_id:uuid}/invitations/{invitation_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="UpdateOrganizationInvitation",
)
async def handle_update_organization_invitation(
    request: APIRequest,
    organization_id: UUID,
    invitation_id: UUID,
    data: UpdateOrganizationInvitationRequestBody,
    session_maker: async_sessionmaker[Any],
) -> OrganizationInvitationResponse:
    # Updating organization invitation
        invitation_id=invitation_id,
        uid=request.auth,
    )

    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(
                select(Organization).where(Organization.id == organization_id).where(Organization.deleted_at.is_(None))
            )
            if not organization:
                raise ValidationException("Organization not found")

            invitation = await session.scalar(
                select(OrganizationInvitation)
                .where(OrganizationInvitation.id == invitation_id)
                .where(OrganizationInvitation.organization_id == organization_id)
                .where(OrganizationInvitation.deleted_at.is_(None))
            )
            if not invitation:
                raise ValidationException("Invitation not found")

            if "role" in data:
                current_user_role = await session.scalar(
                    select(OrganizationUser.role)
                    .where(OrganizationUser.organization_id == organization_id)
                    .where(OrganizationUser.firebase_uid == request.auth)
                    .where(OrganizationUser.deleted_at.is_(None))
                )
                if current_user_role == UserRoleEnum.ADMIN and data["role"] == UserRoleEnum.OWNER:
                    raise ValidationException("Admin cannot invite users as Owner")

            update_data: dict[str, Any] = {}
            if "role" in data:
                update_data["role"] = data["role"]

            await session.execute(
                update(OrganizationInvitation)
                .where(OrganizationInvitation.id == invitation_id, OrganizationInvitation.deleted_at.is_(None))
                .values(update_data)
            )

            updated_invitation = await session.scalar(
                select(OrganizationInvitation).where(
                    OrganizationInvitation.id == invitation_id, OrganizationInvitation.deleted_at.is_(None)
                )
            )

            await log_organization_audit_from_request(
                session=session,
                request=request,
                organization_id=organization_id,
                action=UPDATE_INVITATION,
                details={
                    "invitation_id": str(invitation_id),
                    "email": invitation.email,
                    "updates": update_data,
                },
            )

            await session.commit()

            return OrganizationInvitationResponse(
                id=str(updated_invitation.id),
                email=updated_invitation.email,
                role=updated_invitation.role,
                invitation_sent_at=updated_invitation.invitation_sent_at.isoformat(),
                accepted_at=updated_invitation.accepted_at.isoformat() if updated_invitation.accepted_at else None,
            )

        except SQLAlchemyError as e:
            logger.error("Error updating organization invitation", exc_info=e)
            raise DatabaseError("Error updating organization invitation", context=str(e)) from e


@delete(
    "/organizations/{organization_id:uuid}/invitations/{invitation_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN],
    operation_id="DeleteOrganizationInvitation",
)
async def handle_delete_organization_invitation(
    request: APIRequest,
    organization_id: UUID,
    invitation_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> None:
    # Deleting organization invitation
        invitation_id=invitation_id,
        uid=request.auth,
    )

    async with session_maker() as session, session.begin():
        try:
            organization = await session.scalar(
                select(Organization).where(Organization.id == organization_id).where(Organization.deleted_at.is_(None))
            )
            if not organization:
                raise ValidationException("Organization not found")

            invitation = await session.scalar(
                select(OrganizationInvitation)
                .where(OrganizationInvitation.id == invitation_id)
                .where(OrganizationInvitation.organization_id == organization_id)
                .where(OrganizationInvitation.deleted_at.is_(None))
            )
            if not invitation:
                raise ValidationException("Invitation not found")

            invitation.soft_delete()

            await log_organization_audit_from_request(
                session=session,
                request=request,
                organization_id=organization_id,
                action=DELETE_INVITATION,
                details={
                    "invitation_id": str(invitation_id),
                    "email": invitation.email,
                    "role": invitation.role.value,
                },
            )

            await session.commit()

        except SQLAlchemyError as e:
            logger.error("Error deleting organization invitation", exc_info=e)
            raise DatabaseError("Error deleting organization invitation", context=str(e)) from e
