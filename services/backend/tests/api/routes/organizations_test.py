from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization, OrganizationUser, Project
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


async def test_create_organization_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    mock_admin_code: None,
) -> None:
    org_data = {
        "name": "Test Organization",
        "description": "A test organization",
        "logo_url": "https://example.com/logo.png",
        "contact_email": "contact@test.org",
        "contact_person_name": "John Doe",
        "institutional_affiliation": "Test University",
        "firebase_uid": firebase_uid,
    }

    response = await test_client.post(
        "/organizations",
        headers={"Authorization": "test-admin-code"},
        json=org_data,
    )

    assert response.status_code == HTTPStatus.CREATED
    result = response.json()
    assert "id" in result

    async with async_session_maker() as session:
        organization = await session.scalar(select(Organization).where(Organization.id == result["id"]))
        assert organization is not None
        assert organization.name == org_data["name"]
        assert organization.description == org_data["description"]

        user_org = await session.scalar(
            select(OrganizationUser)
            .where(OrganizationUser.organization_id == organization.id)
            .where(OrganizationUser.firebase_uid == firebase_uid)
        )
        assert user_org is not None
        assert user_org.role == UserRoleEnum.OWNER
        assert user_org.has_all_projects_access is True


async def test_create_organization_minimal_data(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    mock_admin_code: None,
) -> None:
    org_data = {
        "name": "Minimal Organization",
        "firebase_uid": firebase_uid,
    }

    response = await test_client.post(
        "/organizations",
        headers={"Authorization": "test-admin-code"},
        json=org_data,
    )

    assert response.status_code == HTTPStatus.CREATED
    result = response.json()
    assert "id" in result

    async with async_session_maker() as session:
        organization = await session.scalar(select(Organization).where(Organization.id == result["id"]))
        assert organization is not None
        assert organization.name == org_data["name"]
        assert organization.description is None
        assert organization.logo_url is None


async def test_create_organization_database_error(
    test_client: TestingClientType,
    firebase_uid: str,
    mock_admin_code: None,
    mocker: Any,
) -> None:
    mocker.patch(
        "sqlalchemy.ext.asyncio.AsyncSession.commit",
        side_effect=SQLAlchemyError("Database error"),
    )

    response = await test_client.post(
        "/organizations",
        headers={"Authorization": "test-admin-code"},
        json={"name": "Error Organization", "firebase_uid": firebase_uid},
    )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "database" in response.json()["detail"].lower()


async def test_list_organizations_success(
    test_client: TestingClientType,
    organization: Organization,
    project: Project,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    mock_admin_code: None,
) -> None:
    async with async_session_maker() as session, session.begin():
        org2 = Organization(
            name="Second Organization",
            description="Another org",
        )
        session.add(org2)
        await session.flush()

        user_org2 = OrganizationUser(
            organization_id=org2.id,
            firebase_uid=firebase_uid,
            role=UserRoleEnum.ADMIN,
            has_all_projects_access=True,
        )
        session.add(user_org2)

        other_member = OrganizationUser(
            organization_id=org2.id,
            firebase_uid="other_user",
            role=UserRoleEnum.COLLABORATOR,
            has_all_projects_access=False,
        )
        session.add(other_member)

        await session.commit()

    response = await test_client.get(
        f"/organizations?firebase_uid={firebase_uid}",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.OK
    organizations = response.json()

    assert len(organizations) == 2

    org1_data = next(o for o in organizations if o["name"] == organization.name)
    assert org1_data["role"] == UserRoleEnum.OWNER.value
    assert org1_data["projects_count"] == 1
    assert org1_data["members_count"] == 1

    org2_data = next(o for o in organizations if o["name"] == "Second Organization")
    assert org2_data["role"] == UserRoleEnum.ADMIN.value
    assert org2_data["members_count"] == 2


async def test_list_organizations_empty(
    test_client: TestingClientType,
    mock_admin_code: None,
) -> None:
    response = await test_client.get(
        "/organizations?firebase_uid=nonexistent123",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.OK
    organizations = response.json()
    assert organizations == []


async def test_list_organizations_excludes_deleted(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
    firebase_uid: str,
    mock_admin_code: None,
) -> None:
    async with async_session_maker() as session, session.begin():
        org = await session.scalar(select(Organization).where(Organization.id == organization.id))
        org.soft_delete()
        await session.commit()

    response = await test_client.get(
        f"/organizations?firebase_uid={firebase_uid}",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.OK
    organizations = response.json()
    assert len(organizations) == 0


async def test_get_organization_success(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    response = await test_client.get(
        f"/organizations/{organization.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.OK
    org_data = response.json()

    assert org_data["id"] == str(organization.id)
    assert org_data["name"] == organization.name
    assert org_data["role"] == UserRoleEnum.OWNER.value
    assert "created_at" in org_data
    assert "updated_at" in org_data


async def test_get_organization_not_found(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_id = uuid4()

    response = await test_client.get(
        f"/organizations/{non_existent_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "organization not found" in response.json()["detail"].lower()


async def test_get_organization_not_member(
    test_client: TestingClientType,
    organization: Organization,
    otp_code: str,
) -> None:
    response = await test_client.get(
        f"/organizations/{organization.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "not a member" in response.json()["detail"].lower()


async def test_get_organization_deleted(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    async with async_session_maker() as session, session.begin():
        org = await session.scalar(select(Organization).where(Organization.id == organization.id))
        org.soft_delete()
        await session.commit()

    response = await test_client.get(
        f"/organizations/{organization.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "organization not found" in response.json()["detail"].lower()


async def test_update_organization_success(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    update_data = {
        "name": "Updated Organization",
        "description": "Updated description",
        "contact_email": "updated@test.org",
    }

    response = await test_client.patch(
        f"/organizations/{organization.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json=update_data,
    )

    assert response.status_code == HTTPStatus.OK
    org_data = response.json()

    assert org_data["name"] == update_data["name"]
    assert org_data["description"] == update_data["description"]
    assert org_data["contact_email"] == update_data["contact_email"]

    async with async_session_maker() as session:
        updated_org = await session.scalar(select(Organization).where(Organization.id == organization.id))
        assert updated_org.name == update_data["name"]
        assert updated_org.description == update_data["description"]


async def test_update_organization_partial(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    update_data = {"name": "Partially Updated Organization"}

    response = await test_client.patch(
        f"/organizations/{organization.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json=update_data,
    )

    assert response.status_code == HTTPStatus.OK
    org_data = response.json()

    assert org_data["name"] == update_data["name"]

    assert org_data["description"] == organization.description


async def test_update_organization_not_found(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_id = uuid4()

    response = await test_client.patch(
        f"/organizations/{non_existent_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={"name": "Updated"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_organization_database_error(
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

    response = await test_client.patch(
        f"/organizations/{organization.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={"name": "Error Update"},
    )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "database" in response.json()["detail"].lower()


async def test_delete_organization_success(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    async with async_session_maker() as session, session.begin():
        collaborator = OrganizationUser(
            organization_id=organization.id,
            firebase_uid="collaborator123",
            role=UserRoleEnum.COLLABORATOR,
            has_all_projects_access=False,
        )
        session.add(collaborator)
        await session.commit()

    with patch("services.backend.src.api.routes.organizations.schedule_organization_deletion") as mock_schedule:
        mock_schedule.return_value = {
            "scheduled_hard_delete_at": datetime.now(UTC) + timedelta(days=30),
            "grace_period_days": 30,
        }

        response = await test_client.delete(
            f"/organizations/{organization.id}",
            headers={"Authorization": f"Bearer {otp_code}"},
        )

    assert response.status_code == HTTPStatus.OK
    result = response.json()

    assert "scheduled for deletion" in result["message"]
    assert result["grace_period_days"] == 30
    assert "scheduled_deletion_date" in result
    assert "restoration_info" in result

    async with async_session_maker() as session:
        org = await session.scalar(select(Organization).where(Organization.id == organization.id))
        assert org.deleted_at is not None

        collaborator_count = await session.scalar(
            select(func.count())
            .select_from(OrganizationUser)
            .where(OrganizationUser.organization_id == organization.id)
            .where(OrganizationUser.role != UserRoleEnum.OWNER)
        )
        assert collaborator_count == 0

        owner = await session.scalar(
            select(OrganizationUser)
            .where(OrganizationUser.organization_id == organization.id)
            .where(OrganizationUser.role == UserRoleEnum.OWNER)
        )
        assert owner is not None


async def test_delete_organization_not_found(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_id = uuid4()

    response = await test_client.delete(
        f"/organizations/{non_existent_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_delete_organization_database_error(
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

    response = await test_client.delete(
        f"/organizations/{organization.id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "database" in response.json()["detail"].lower()


async def test_delete_organization_schedule_error(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    with patch("services.backend.src.utils.firebase.schedule_organization_deletion") as mock_schedule:
        mock_schedule.side_effect = Exception("Firebase error")

        response = await test_client.delete(
            f"/organizations/{organization.id}",
            headers={"Authorization": f"Bearer {otp_code}"},
        )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "scheduling organization deletion" in response.json()["detail"].lower()


async def test_restore_organization_success(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    async with async_session_maker() as session, session.begin():
        org = await session.scalar(select(Organization).where(Organization.id == organization.id))
        org.soft_delete()
        await session.commit()

    mock_db = AsyncMock()
    mock_doc_ref = AsyncMock()
    mock_db.collection.return_value.document.return_value = mock_doc_ref

    with patch("google.cloud.firestore.AsyncClient", return_value=mock_db):
        response = await test_client.post(
            f"/organizations/{organization.id}/restore",
            headers={"Authorization": f"Bearer {otp_code}"},
        )

    assert response.status_code == HTTPStatus.OK
    org_data = response.json()

    assert org_data["id"] == str(organization.id)
    assert org_data["name"] == organization.name


async def test_restore_organization_not_found(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_id = uuid4()

    response = await test_client.post(
        f"/organizations/{non_existent_id}/restore",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_restore_organization_not_deleted(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    response = await test_client.post(
        f"/organizations/{organization.id}/restore",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "not deleted" in response.json()["detail"].lower()


async def test_restore_organization_database_error(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
    mocker: Any,
) -> None:
    async with async_session_maker() as session, session.begin():
        org = await session.scalar(select(Organization).where(Organization.id == organization.id))
        org.soft_delete()
        await session.commit()

    mocker.patch(
        "sqlalchemy.ext.asyncio.AsyncSession.commit",
        side_effect=SQLAlchemyError("Database error"),
    )

    response = await test_client.post(
        f"/organizations/{organization.id}/restore",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "database" in response.json()["detail"].lower()


async def test_restore_organization_firestore_error(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
    otp_code: str,
) -> None:
    async with async_session_maker() as session, session.begin():
        org = await session.scalar(select(Organization).where(Organization.id == organization.id))
        org.soft_delete()
        await session.commit()

    mock_db = AsyncMock()
    mock_db.collection.return_value.document.return_value.update.side_effect = Exception("Firestore error")

    with patch("google.cloud.firestore.AsyncClient", return_value=mock_db):
        response = await test_client.post(
            f"/organizations/{organization.id}/restore",
            headers={"Authorization": f"Bearer {otp_code}"},
        )

    assert response.status_code == HTTPStatus.OK
    org_data = response.json()
    assert org_data["id"] == str(organization.id)
