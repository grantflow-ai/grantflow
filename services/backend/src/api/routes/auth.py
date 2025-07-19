from datetime import timedelta
from typing import Any, TypedDict

from litestar import get, post
from litestar.exceptions import NotAuthorizedException
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization, OrganizationUser, Project
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.common_types import APIRequest
from services.backend.src.utils.firebase import verify_id_token
from services.backend.src.utils.jwt import create_jwt

logger = get_logger(__name__)


class OTPResponse(TypedDict):
    otp: str


class LoginRequestBody(TypedDict):
    id_token: str


class LoginResponse(TypedDict):
    jwt_token: str


def _get_role_priority(role: UserRoleEnum) -> int:
    """Return role priority for organization selection. Higher is better."""
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
        result = await session.execute(
            select(OrganizationUser)
            .join(Organization, OrganizationUser.organization_id == Organization.id)
            .where(
                OrganizationUser.firebase_uid == firebase_uid,
                OrganizationUser.deleted_at.is_(None),
                Organization.deleted_at.is_(None),
            )
            .order_by(desc(Organization.updated_at))
        )
        organization_users = result.scalars().all()

        if not organization_users:
            default_organization = Organization(name="My Organization")
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
            
            default_org_user = max(
                organization_users,
                key=lambda ou: (_get_role_priority(ou.role), ou.organization.updated_at),
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
