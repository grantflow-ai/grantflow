from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any
from uuid import uuid4

import pytest
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization, OrganizationInvitation, OrganizationUser, Project
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.src.utils.jwt import verify_jwt_token
from services.backend.tests.conftest import TestingClientType


@pytest.fixture
async def admin_user(
    async_session_maker: async_sessionmaker[Any],
    organization: Organization,
) -> OrganizationUser:
    async with async_session_maker() as session, session.begin():
        user = OrganizationUser(
            firebase_uid="e" * 128,
            organization_id=organization.id,
            role=UserRoleEnum.ADMIN,
            has_all_projects_access=True,
        )
        session.add(user)
        await session.commit()
    return user


@pytest.fixture
async def existing_invitation(
    async_session_maker: async_sessionmaker[Any],
    organization: Organization,
) -> OrganizationInvitation:
    async with async_session_maker() as session, session.begin():
        invitation = OrganizationInvitation(
            organization_id=organization.id,
            email="invited@example.com",
            role=UserRoleEnum.COLLABORATOR,
            invitation_sent_at=datetime.now(UTC),
        )
        session.add(invitation)
        await session.commit()
    return invitation


async def test_list_organization_invitations_success(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
) -> None:
    response = await test_client.get(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.OK
    invitations = response.json()

    assert len(invitations) == 1
    assert invitations[0]["id"] == str(existing_invitation.id)
    assert invitations[0]["email"] == existing_invitation.email
    assert invitations[0]["role"] == existing_invitation.role.value
    assert invitations[0]["accepted_at"] is None


async def test_list_organization_invitations_organization_not_found(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_org_id = uuid4()
    response = await test_client.get(
        f"/organizations/{non_existent_org_id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_create_organization_invitation_success(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    new_email = "newuser@example.com"

    response = await test_client.post(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "email": new_email,
            "role": UserRoleEnum.COLLABORATOR.value,
            "has_all_projects_access": True,
        },
    )

    assert response.status_code == HTTPStatus.CREATED
    result = response.json()
    assert "token" in result
    assert "expires_at" in result

    decoded = verify_jwt_token(result["token"])
    assert decoded.startswith("invitation:")

    async with async_session_maker() as session:
        invitation = await session.scalar(
            select(OrganizationInvitation)
            .where(OrganizationInvitation.organization_id == organization.id)
            .where(OrganizationInvitation.email == new_email)
        )
        assert invitation is not None
        assert invitation.role == UserRoleEnum.COLLABORATOR


async def test_create_organization_invitation_already_exists(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
) -> None:
    response = await test_client.post(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "email": existing_invitation.email,
            "role": UserRoleEnum.ADMIN.value,
        },
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "already exists" in response.json()["detail"].lower()


async def test_create_organization_invitation_admin_cannot_invite_owner(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    admin_user: OrganizationUser,
    otp_code: str,
) -> None:
    response = await test_client.post(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "email": "owner@example.com",
            "role": UserRoleEnum.OWNER.value,
        },
    )

    assert response.status_code == HTTPStatus.CREATED


async def test_create_organization_invitation_organization_not_found(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_org_id = uuid4()

    response = await test_client.post(
        f"/organizations/{non_existent_org_id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "email": "test@example.com",
            "role": UserRoleEnum.COLLABORATOR.value,
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_create_organization_invitation_database_error(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
    mocker: Any,
) -> None:
    mocker.patch(
        "sqlalchemy.ext.asyncio.AsyncSession.commit",
        side_effect=SQLAlchemyError("Database error"),
    )

    response = await test_client.post(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "email": "error@example.com",
            "role": UserRoleEnum.COLLABORATOR.value,
        },
    )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "database" in response.json()["detail"].lower()


async def test_update_organization_invitation_success(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.patch(
        f"/organizations/{organization.id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.ADMIN.value,
        },
    )

    assert response.status_code == HTTPStatus.OK
    result = response.json()
    assert result["id"] == str(existing_invitation.id)
    assert result["role"] == UserRoleEnum.ADMIN.value

    async with async_session_maker() as session:
        invitation = await session.scalar(
            select(OrganizationInvitation).where(OrganizationInvitation.id == existing_invitation.id)
        )
        assert invitation is not None
        assert invitation.role == UserRoleEnum.ADMIN


async def test_update_organization_invitation_not_found(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_invitation_id = uuid4()

    response = await test_client.patch(
        f"/organizations/{organization.id}/invitations/{non_existent_invitation_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.ADMIN.value,
        },
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "invitation not found" in response.json()["detail"].lower()


async def test_update_organization_invitation_organization_not_found(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
) -> None:
    non_existent_org_id = uuid4()

    response = await test_client.patch(
        f"/organizations/{non_existent_org_id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.ADMIN.value,
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_organization_invitation_admin_cannot_promote_to_owner(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
) -> None:
    response = await test_client.patch(
        f"/organizations/{organization.id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.OWNER.value,
        },
    )

    assert response.status_code == HTTPStatus.OK


async def test_update_organization_invitation_database_error(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
    mocker: Any,
) -> None:
    mocker.patch(
        "sqlalchemy.ext.asyncio.AsyncSession.commit",
        side_effect=SQLAlchemyError("Database error"),
    )

    response = await test_client.patch(
        f"/organizations/{organization.id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.ADMIN.value,
        },
    )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "database" in response.json()["detail"].lower()


async def test_delete_organization_invitation_success(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/organizations/{organization.id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        invitation = await session.scalar(
            select(OrganizationInvitation).where(OrganizationInvitation.id == existing_invitation.id)
        )
        assert invitation is not None
        assert invitation.deleted_at is not None


async def test_delete_organization_invitation_not_found(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_invitation_id = uuid4()

    response = await test_client.delete(
        f"/organizations/{organization.id}/invitations/{non_existent_invitation_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "invitation not found" in response.json()["detail"].lower()


async def test_delete_organization_invitation_organization_not_found(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
) -> None:
    non_existent_org_id = uuid4()

    response = await test_client.delete(
        f"/organizations/{non_existent_org_id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_organization_invitation_database_error(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
    mocker: Any,
) -> None:
    mocker.patch(
        "sqlalchemy.ext.asyncio.AsyncSession.commit",
        side_effect=SQLAlchemyError("Database error"),
    )

    response = await test_client.delete(
        f"/organizations/{organization.id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "database" in response.json()["detail"].lower()


async def test_list_invitations_as_admin(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    admin_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
) -> None:
    response = await test_client.get(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.OK
    invitations = response.json()
    assert len(invitations) >= 1


async def test_create_invitation_with_expired_invitation(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        accepted_invitation = OrganizationInvitation(
            organization_id=organization.id,
            email="accepted@example.com",
            role=UserRoleEnum.COLLABORATOR,
            invitation_sent_at=datetime.now(UTC) - timedelta(days=10),
            accepted_at=datetime.now(UTC) - timedelta(days=5),
        )
        session.add(accepted_invitation)
        await session.commit()

    response = await test_client.post(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "email": "accepted@example.com",
            "role": UserRoleEnum.ADMIN.value,
        },
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "already exists" in response.json()["detail"].lower()


async def test_invitation_token_expiry(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    response = await test_client.post(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "email": "expiry@example.com",
            "role": UserRoleEnum.COLLABORATOR.value,
        },
    )

    assert response.status_code == HTTPStatus.CREATED
    result = response.json()

    expires_at = datetime.fromisoformat(result["expires_at"])
    expected_expiry = datetime.now(UTC) + timedelta(hours=72)

    assert abs((expires_at - expected_expiry).total_seconds()) < 60


async def test_create_invitation_inviter_not_found(
    test_client: TestingClientType,
    organization: Organization,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        other_org = Organization(name="Other Org")
        session.add(other_org)
        await session.commit()
        other_org_id = other_org.id

    response = await test_client.post(
        f"/organizations/{other_org_id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "email": "test@example.com",
            "role": UserRoleEnum.COLLABORATOR.value,
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_create_invitation_with_project_ids(
    test_client: TestingClientType,
    organization: Organization,
    project: Project,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        project2 = Project(
            name="Project 2",
            organization_id=organization.id,
        )
        session.add(project2)
        await session.commit()
        project2_id = project2.id

    response = await test_client.post(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "email": "projectaccess@example.com",
            "role": UserRoleEnum.COLLABORATOR.value,
            "has_all_projects_access": False,
            "project_ids": [str(project.id), str(project2_id)],
        },
    )

    assert response.status_code == HTTPStatus.CREATED
    result = response.json()
    assert "token" in result


async def test_update_invitation_accepted_invitation(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        accepted_invitation = OrganizationInvitation(
            organization_id=organization.id,
            email="accepted@example.com",
            role=UserRoleEnum.COLLABORATOR,
            invitation_sent_at=datetime.now(UTC) - timedelta(days=1),
            accepted_at=datetime.now(UTC),
        )
        session.add(accepted_invitation)
        await session.commit()
        invitation_id = accepted_invitation.id

    response = await test_client.patch(
        f"/organizations/{organization.id}/invitations/{invitation_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.ADMIN.value,
        },
    )

    assert response.status_code == HTTPStatus.OK
    result = response.json()
    assert result["accepted_at"] is not None


async def test_update_invitation_no_changes(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
) -> None:
    response = await test_client.patch(
        f"/organizations/{organization.id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={},
    )

    assert response.status_code == HTTPStatus.OK
    result = response.json()
    assert result["role"] == existing_invitation.role.value


async def test_list_invitations_with_multiple_invitations(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        invitations = []
        for i in range(3):
            invitation = OrganizationInvitation(
                organization_id=organization.id,
                email=f"user{i}@example.com",
                role=UserRoleEnum.COLLABORATOR,
                invitation_sent_at=datetime.now(UTC) - timedelta(days=i),
            )
            invitations.append(invitation)
            session.add(invitation)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.OK
    result = response.json()
    assert len(result) >= 3

    emails = {inv["email"] for inv in result}
    for i in range(3):
        assert f"user{i}@example.com" in emails


async def test_create_invitation_check_audit_log(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    new_email = "audited@example.com"

    response = await test_client.post(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "email": new_email,
            "role": UserRoleEnum.ADMIN.value,
            "has_all_projects_access": True,
        },
    )

    assert response.status_code == HTTPStatus.CREATED

    from packages.db.src.tables import OrganizationAuditLog

    async with async_session_maker() as session:
        audit_log = await session.scalar(
            select(OrganizationAuditLog)
            .where(OrganizationAuditLog.organization_id == organization.id)
            .where(OrganizationAuditLog.action == "create_invitation")
            .order_by(OrganizationAuditLog.created_at.desc())
        )
        assert audit_log is not None
        assert audit_log.details["email"] == new_email
        assert audit_log.details["role"] == UserRoleEnum.ADMIN.value


async def test_delete_invitation_check_soft_delete_timestamp(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    before_delete = datetime.now(UTC)

    response = await test_client.delete(
        f"/organizations/{organization.id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        invitation = await session.scalar(
            select(OrganizationInvitation).where(OrganizationInvitation.id == existing_invitation.id)
        )
        assert invitation is not None
        assert invitation.deleted_at is not None
        assert invitation.deleted_at >= before_delete


async def test_list_invitations_deleted_organization(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        deleted_org = Organization(name="Deleted Org")
        deleted_org.soft_delete()
        session.add(deleted_org)
        await session.commit()
        deleted_org_id = deleted_org.id

    response = await test_client.get(
        f"/organizations/{deleted_org_id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_create_invitation_deleted_organization(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        deleted_org = Organization(name="Deleted Org")
        deleted_org.soft_delete()
        session.add(deleted_org)
        await session.commit()
        deleted_org_id = deleted_org.id

    response = await test_client.post(
        f"/organizations/{deleted_org_id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "email": "test@example.com",
            "role": UserRoleEnum.COLLABORATOR.value,
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_invitation_deleted_organization(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        deleted_org = Organization(name="Deleted Org")
        deleted_org.soft_delete()
        session.add(deleted_org)
        await session.commit()
        deleted_org_id = deleted_org.id

    response = await test_client.patch(
        f"/organizations/{deleted_org_id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.ADMIN.value,
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_invitation_deleted_organization(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        deleted_org = Organization(name="Deleted Org")
        deleted_org.soft_delete()
        session.add(deleted_org)
        await session.commit()
        deleted_org_id = deleted_org.id

    response = await test_client.delete(
        f"/organizations/{deleted_org_id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_create_invitation_deleted_inviter(
    test_client: TestingClientType,
    organization: Organization,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        new_org = Organization(name="New Org")
        session.add(new_org)
        await session.flush()

        deleted_member = OrganizationUser(
            firebase_uid="a" * 128,
            organization_id=new_org.id,
            role=UserRoleEnum.OWNER,
            has_all_projects_access=True,
        )
        deleted_member.soft_delete()
        session.add(deleted_member)

        await session.commit()
        new_org_id = new_org.id

    response = await test_client.post(
        f"/organizations/{new_org_id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "email": "test@example.com",
            "role": UserRoleEnum.COLLABORATOR.value,
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_invitation_deleted_invitation(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        deleted_invitation = OrganizationInvitation(
            organization_id=organization.id,
            email="deleted@example.com",
            role=UserRoleEnum.COLLABORATOR,
            invitation_sent_at=datetime.now(UTC),
        )
        deleted_invitation.soft_delete()
        session.add(deleted_invitation)
        await session.commit()
        deleted_invitation_id = deleted_invitation.id

    response = await test_client.patch(
        f"/organizations/{organization.id}/invitations/{deleted_invitation_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.ADMIN.value,
        },
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "invitation not found" in response.json()["detail"].lower()


async def test_delete_invitation_deleted_invitation(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        deleted_invitation = OrganizationInvitation(
            organization_id=organization.id,
            email="deleted@example.com",
            role=UserRoleEnum.COLLABORATOR,
            invitation_sent_at=datetime.now(UTC),
        )
        deleted_invitation.soft_delete()
        session.add(deleted_invitation)
        await session.commit()
        deleted_invitation_id = deleted_invitation.id

    response = await test_client.delete(
        f"/organizations/{organization.id}/invitations/{deleted_invitation_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "invitation not found" in response.json()["detail"].lower()


async def test_update_invitation_admin_checking_role(
    test_client: TestingClientType,
    organization: Organization,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        admin_user = OrganizationUser(
            firebase_uid="a" * 128,
            organization_id=organization.id,
            role=UserRoleEnum.ADMIN,
            has_all_projects_access=True,
        )
        session.add(admin_user)

        owner = await session.scalar(
            select(OrganizationUser)
            .where(OrganizationUser.organization_id == organization.id)
            .where(OrganizationUser.role == UserRoleEnum.OWNER)
        )
        if owner:
            await session.delete(owner)

        await session.commit()

    response = await test_client.patch(
        f"/organizations/{organization.id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.OWNER.value,
        },
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "admin cannot invite users as owner" in response.json()["detail"].lower()


async def test_update_invitation_ignores_soft_deleted(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session:
        existing_invitation.soft_delete()
        session.add(existing_invitation)
        await session.commit()

    response = await test_client.patch(
        f"/organizations/{organization.id}/invitations/{existing_invitation.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.ADMIN.value,
        },
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "invitation not found" in response.json()["detail"].lower()


async def test_get_invitation_excludes_soft_deleted(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    existing_invitation: OrganizationInvitation,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.get(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
    )
    assert response.status_code == HTTPStatus.OK
    initial_invitations = response.json()
    assert any(inv["id"] == str(existing_invitation.id) for inv in initial_invitations)

    async with async_session_maker() as session, session.begin():
        existing_invitation.soft_delete()
        session.add(existing_invitation)

    response = await test_client.get(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
    )
    assert response.status_code == HTTPStatus.OK
    new_invitations = response.json()
    assert not any(inv["id"] == str(existing_invitation.id) for inv in new_invitations)


async def test_list_invitations_excludes_soft_deleted(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    invitations = []
    async with async_session_maker() as session:
        for i in range(3):
            invitation = OrganizationInvitation(
                organization_id=organization.id,
                email=f"test-user-{i}@example.com",
                role=UserRoleEnum.COLLABORATOR,
                invitation_sent_at=datetime.now(UTC),
            )
            session.add(invitation)
            invitations.append(invitation)
        await session.commit()

        for invitation in invitations:
            await session.refresh(invitation)

    response = await test_client.get(
        f"/organizations/{organization.id}/invitations",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    if response.status_code == HTTPStatus.OK:
        initial_count = len(response.json())

        async with async_session_maker() as session:
            invitations[0].soft_delete()
            session.add(invitations[0])
            await session.commit()

        response = await test_client.get(
            f"/organizations/{organization.id}/invitations",
            headers={"Authorization": f"Bearer {otp_code}"},
        )

        assert response.status_code == HTTPStatus.OK
        new_count = len(response.json())
        assert new_count == initial_count - 1

        invitation_ids = {inv["id"] for inv in response.json()}
        assert str(invitations[0].id) not in invitation_ids
