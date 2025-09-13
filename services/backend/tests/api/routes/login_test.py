from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock

from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization, OrganizationInvitation, OrganizationUser, Project
from pytest_mock import MockerFixture
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.api.routes.auth import LoginRequestBody
from services.backend.tests.conftest import TestingClientType


async def test_login_new_user_creates_organization_and_project(
    test_client: TestingClientType,
    mocker: MockerFixture,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    mocker.patch("services.backend.src.utils.jwt.encode", return_value="jwt_token")
    verify_mock = AsyncMock(return_value={"uid": firebase_uid})
    mocker.patch(
        "services.backend.src.api.routes.auth.verify_id_token",
        verify_mock,
    )
    get_user_mock = AsyncMock(return_value={"uid": firebase_uid, "email": f"test-{firebase_uid}@example.com"})
    mocker.patch(
        "services.backend.src.api.routes.auth.get_user",
        get_user_mock,
    )

    response = await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
    assert response.status_code == HTTPStatus.CREATED
    response_body = response.json()
    assert response_body["jwt_token"] == "jwt_token"

    async with async_session_maker() as session:
        org_user = await session.scalar(select(OrganizationUser).where(OrganizationUser.firebase_uid == firebase_uid))
        assert org_user is not None
        assert org_user.role == UserRoleEnum.OWNER

        organization = await session.scalar(select(Organization).where(Organization.id == org_user.organization_id))
        assert organization is not None
        assert organization.name == "New Organization"

        project = await session.scalar(select(Project).where(Project.organization_id == org_user.organization_id))
        assert project is not None
        assert project.name == "New Research Project"


async def test_login_existing_user_keeps_organization(
    test_client: TestingClientType,
    mocker: MockerFixture,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    mocker.patch("services.backend.src.utils.jwt.encode", return_value="jwt_token")
    verify_mock = AsyncMock(return_value={"uid": firebase_uid})
    mocker.patch(
        "services.backend.src.api.routes.auth.verify_id_token",
        verify_mock,
    )
    get_user_mock = AsyncMock(return_value={"uid": firebase_uid, "email": f"test-{firebase_uid}@example.com"})
    mocker.patch(
        "services.backend.src.api.routes.auth.get_user",
        get_user_mock,
    )

    await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))

    async with async_session_maker() as session:
        org_user = await session.scalar(select(OrganizationUser).where(OrganizationUser.firebase_uid == firebase_uid))
        assert org_user is not None
        original_organization_id = org_user.organization_id

    response = await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
    assert response.status_code == HTTPStatus.CREATED
    response_body = response.json()
    assert response_body["jwt_token"] == "jwt_token"

    async with async_session_maker() as session:
        org_user = await session.scalar(select(OrganizationUser).where(OrganizationUser.firebase_uid == firebase_uid))
        assert org_user is not None
        assert org_user.organization_id == original_organization_id


async def test_login_user_with_pending_invitation_accepts_invitation(
    test_client: TestingClientType,
    mocker: MockerFixture,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    email = "invitation-test@example.com"

    async with async_session_maker() as session, session.begin():
        org = Organization(name="Existing Organization")
        session.add(org)
        await session.flush()

        invitation = OrganizationInvitation(
            organization_id=org.id,
            email=email,
            role=UserRoleEnum.COLLABORATOR,
            invitation_sent_at=datetime.now(UTC),
        )
        session.add(invitation)
        await session.flush()

        org_id = org.id
        invitation_id = invitation.id

    mocker.patch("services.backend.src.utils.jwt.encode", return_value="jwt_token")
    verify_mock = AsyncMock(return_value={"uid": firebase_uid})
    mocker.patch(
        "services.backend.src.api.routes.auth.verify_id_token",
        verify_mock,
    )
    get_user_mock = AsyncMock(return_value={"uid": firebase_uid, "email": email})
    mocker.patch(
        "services.backend.src.api.routes.auth.get_user",
        get_user_mock,
    )

    response = await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
    assert response.status_code == HTTPStatus.CREATED

    async with async_session_maker() as session:
        org_user = await session.scalar(select(OrganizationUser).where(OrganizationUser.firebase_uid == firebase_uid))
        assert org_user is not None
        assert org_user.organization_id == org_id
        assert org_user.role == UserRoleEnum.COLLABORATOR

        invitation = await session.scalar(
            select(OrganizationInvitation).where(OrganizationInvitation.id == invitation_id)
        )
        assert invitation is not None
        assert invitation.accepted_at is not None

        orgs = list(
            await session.scalars(
                select(Organization).join(OrganizationUser).where(OrganizationUser.firebase_uid == firebase_uid)
            )
        )
        assert len(orgs) == 1
        assert orgs[0].name == "Existing Organization"


async def test_login_user_with_multiple_pending_invitations(
    test_client: TestingClientType,
    mocker: MockerFixture,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    email = "invitation-test@example.com"

    async with async_session_maker() as session, session.begin():
        org1 = Organization(name="Organization 1")
        org2 = Organization(name="Organization 2")
        session.add_all([org1, org2])
        await session.flush()

        invitation1 = OrganizationInvitation(
            organization_id=org1.id,
            email=email,
            role=UserRoleEnum.ADMIN,
            invitation_sent_at=datetime.now(UTC),
        )
        invitation2 = OrganizationInvitation(
            organization_id=org2.id,
            email=email,
            role=UserRoleEnum.OWNER,
            invitation_sent_at=datetime.now(UTC),
        )
        session.add_all([invitation1, invitation2])
        await session.flush()

        org1_id = org1.id
        org2_id = org2.id

    mocker.patch("services.backend.src.utils.jwt.encode", return_value="jwt_token")
    verify_mock = AsyncMock(return_value={"uid": firebase_uid})
    mocker.patch(
        "services.backend.src.api.routes.auth.verify_id_token",
        verify_mock,
    )
    get_user_mock = AsyncMock(return_value={"uid": firebase_uid, "email": email})
    mocker.patch(
        "services.backend.src.api.routes.auth.get_user",
        get_user_mock,
    )

    response = await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
    assert response.status_code == HTTPStatus.CREATED

    async with async_session_maker() as session:
        org_users = list(
            await session.scalars(select(OrganizationUser).where(OrganizationUser.firebase_uid == firebase_uid))
        )
        assert len(org_users) == 2

        org_ids = {ou.organization_id for ou in org_users}
        assert org1_id in org_ids
        assert org2_id in org_ids

        roles = {ou.organization_id: ou.role for ou in org_users}
        assert roles[org1_id] == UserRoleEnum.ADMIN
        assert roles[org2_id] == UserRoleEnum.OWNER

        invitations = list(
            await session.scalars(select(OrganizationInvitation).where(OrganizationInvitation.email == email))
        )
        for invitation in invitations:
            assert invitation.accepted_at is not None


async def test_login_user_without_email_creates_default_organization(
    test_client: TestingClientType,
    mocker: MockerFixture,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
) -> None:
    mocker.patch("services.backend.src.utils.jwt.encode", return_value="jwt_token")
    verify_mock = AsyncMock(return_value={"uid": firebase_uid})
    mocker.patch(
        "services.backend.src.api.routes.auth.verify_id_token",
        verify_mock,
    )
    get_user_mock = AsyncMock(return_value={"uid": firebase_uid})
    mocker.patch(
        "services.backend.src.api.routes.auth.get_user",
        get_user_mock,
    )

    response = await test_client.post("/login", json=LoginRequestBody(id_token="123jeronimo"))
    assert response.status_code == HTTPStatus.CREATED

    async with async_session_maker() as session:
        org_user = await session.scalar(select(OrganizationUser).where(OrganizationUser.firebase_uid == firebase_uid))
        assert org_user is not None
        assert org_user.role == UserRoleEnum.OWNER

        organization = await session.scalar(select(Organization).where(Organization.id == org_user.organization_id))
        assert organization is not None
        assert organization.name == "New Organization"
