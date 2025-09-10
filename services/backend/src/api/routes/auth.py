from datetime import UTC, datetime, timedelta
from typing import Any, TypedDict

from litestar import get, post
from litestar.exceptions import NotAuthorizedException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization, OrganizationInvitation, OrganizationUser, Project
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.common_types import APIRequest
from services.backend.src.utils.firebase import get_user, verify_id_token
from services.backend.src.utils.jwt import create_jwt

logger = get_logger(__name__)


class OTPResponse(TypedDict):
    otp: str


class LoginRequestBody(TypedDict):
    id_token: str


class LoginResponse(TypedDict):
    jwt_token: str


def _get_role_priority(role: UserRoleEnum) -> int:
    role_priorities = {
        UserRoleEnum.OWNER: 3,
        UserRoleEnum.ADMIN: 2,
        UserRoleEnum.COLLABORATOR: 1,
    }
    return role_priorities.get(role, 0)


@post("/login", operation_id="Login")
async def handle_login(data: LoginRequestBody, session_maker: async_sessionmaker[Any]) -> LoginResponse:
    decoded_token = await verify_id_token(data["id_token"])
    firebase_uid = decoded_token["uid"]

    async with session_maker() as session, session.begin():
        # Restore user if they were soft-deleted (grace period)
        soft_deleted_users = await session.execute(
            select(OrganizationUser).where(
                OrganizationUser.firebase_uid == firebase_uid, OrganizationUser.deleted_at.isnot(None)
            )
        )
        soft_deleted_list = soft_deleted_users.scalars().all()

        if soft_deleted_list:
            await session.execute(
                update(OrganizationUser).where(OrganizationUser.firebase_uid == firebase_uid).values(deleted_at=None)
            )
            logger.info(
                "Restored soft-deleted user during login",
                firebase_uid=firebase_uid,
                restored_organizations=len(soft_deleted_list),
            )
        result = await session.execute(
            select(OrganizationUser, Organization.updated_at)
            .join(Organization, OrganizationUser.organization_id == Organization.id)
            .where(
                OrganizationUser.firebase_uid == firebase_uid,
                OrganizationUser.deleted_at.is_(None),
                Organization.deleted_at.is_(None),
            )
            .order_by(desc(Organization.updated_at))
        )
        org_user_tuples = list(result.all())
        organization_users = [row[0] for row in org_user_tuples]

        if not organization_users:
            firebase_user = await get_user(firebase_uid)
            if not firebase_user or not firebase_user.get("email"):
                logger.warning("User has no email", firebase_uid=firebase_uid)
                default_organization = Organization(name="New Organization")
                session.add(default_organization)
                await session.flush()

                default_project = Project(name="New Research Project", organization_id=default_organization.id)
                session.add(default_project)
                await session.flush()

                organization_user = OrganizationUser(
                    organization_id=default_organization.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.OWNER,
                    has_all_projects_access=True,
                )
                session.add(organization_user)

                default_organization_id = default_organization.id
                default_role = UserRoleEnum.OWNER
            else:
                user_email = firebase_user["email"]

                pending_invitations = list(
                    await session.scalars(
                        select(OrganizationInvitation).where(
                            OrganizationInvitation.email == user_email,
                            OrganizationInvitation.deleted_at.is_(None),
                            OrganizationInvitation.accepted_at.is_(None),
                        )
                    )
                )

                if pending_invitations:
                    for invitation in pending_invitations:
                        new_org_user = OrganizationUser(
                            organization_id=invitation.organization_id,
                            firebase_uid=firebase_uid,
                            role=invitation.role,
                            has_all_projects_access=True,
                        )
                        session.add(new_org_user)

                        await session.execute(
                            update(OrganizationInvitation)
                            .where(OrganizationInvitation.id == invitation.id)
                            .values(accepted_at=datetime.now(UTC))
                        )

                        logger.info(
                            "Auto-accepted invitation during login",
                            invitation_id=str(invitation.id),
                            organization_id=str(invitation.organization_id),
                            email=user_email,
                            firebase_uid=firebase_uid,
                        )

                    await session.flush()

                    result = await session.execute(
                        select(OrganizationUser, Organization.updated_at)
                        .join(Organization, OrganizationUser.organization_id == Organization.id)
                        .where(
                            OrganizationUser.firebase_uid == firebase_uid,
                            OrganizationUser.deleted_at.is_(None),
                            Organization.deleted_at.is_(None),
                        )
                        .order_by(desc(Organization.updated_at))
                    )
                    org_user_tuples = list(result.all())

                    default_org_user, default_updated_at = max(
                        org_user_tuples,
                        key=lambda row: (_get_role_priority(row[0].role), row[1]),
                    )
                    default_organization_id = default_org_user.organization_id
                    default_role = default_org_user.role
                else:
                    default_organization = Organization(name="New Organization")
                    session.add(default_organization)
                    await session.flush()

                    default_project = Project(name="New Research Project", organization_id=default_organization.id)
                    session.add(default_project)
                    await session.flush()

                    organization_user = OrganizationUser(
                        organization_id=default_organization.id,
                        firebase_uid=firebase_uid,
                        role=UserRoleEnum.OWNER,
                        has_all_projects_access=True,
                    )
                    session.add(organization_user)

                    default_organization_id = default_organization.id
                    default_role = UserRoleEnum.OWNER

                    logger.info(
                        "Created default organization for new user",
                        firebase_uid=firebase_uid,
                        organization_id=str(default_organization_id),
                        email=user_email,
                    )
        else:
            default_org_user, default_updated_at = max(
                org_user_tuples,
                key=lambda row: (_get_role_priority(row[0].role), row[1]),
            )
            default_organization_id = default_org_user.organization_id
            default_role = default_org_user.role

        logger.info(
            "User login successful",
            firebase_uid=firebase_uid,
            organization_id=str(default_organization_id),
            role=default_role.value,
        )

    jwt = create_jwt(firebase_uid, default_organization_id, default_role)
    return LoginResponse(jwt_token=jwt)


@get("/otp", operation_id="GenerateOtp")
async def handle_create_otp(request: APIRequest) -> OTPResponse:
    # TODO: we need to add a second layer of security here
    if request.auth is None:
        raise NotAuthorizedException("Authentication required")
    otp = create_jwt(firebase_uid=request.auth, ttl=timedelta(hours=1))
    return OTPResponse(otp=otp)
