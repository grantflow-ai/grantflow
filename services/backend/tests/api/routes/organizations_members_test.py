from http import HTTPStatus
from typing import Any
from uuid import uuid4

import pytest
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization, OrganizationUser, Project, ProjectAccess
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


@pytest.fixture
async def second_user_uid() -> str:
    return "b" * 128


@pytest.fixture
async def third_user_uid() -> str:
    return "c" * 128


@pytest.fixture
async def collaborator_user(
    async_session_maker: async_sessionmaker[Any],
    organization: Organization,
    second_user_uid: str,
) -> OrganizationUser:
    async with async_session_maker() as session, session.begin():
        user = OrganizationUser(
            firebase_uid=second_user_uid,
            organization_id=organization.id,
            role=UserRoleEnum.COLLABORATOR,
            has_all_projects_access=True,
        )
        session.add(user)
        await session.commit()
    return user


@pytest.fixture
async def limited_collaborator_user(
    async_session_maker: async_sessionmaker[Any],
    organization: Organization,
    project: Project,
    third_user_uid: str,
) -> OrganizationUser:
    async with async_session_maker() as session, session.begin():
        user = OrganizationUser(
            firebase_uid=third_user_uid,
            organization_id=organization.id,
            role=UserRoleEnum.COLLABORATOR,
            has_all_projects_access=False,
        )
        session.add(user)

        access = ProjectAccess(
            firebase_uid=third_user_uid,
            organization_id=organization.id,
            project_id=project.id,
        )
        session.add(access)

        await session.commit()
    return user


async def test_list_organization_members_success(
    test_client: TestingClientType,
    organization: Organization,
    project: Project,
    project_owner_user: OrganizationUser,
    collaborator_user: OrganizationUser,
    limited_collaborator_user: OrganizationUser,
    otp_code: str,
) -> None:
    response = await test_client.get(
        f"/organizations/{organization.id}/members",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    members = response.json()

    assert len(members) == 3

    owner_member = next(m for m in members if m["firebase_uid"] == project_owner_user.firebase_uid)
    assert owner_member["role"] == UserRoleEnum.OWNER.value
    assert owner_member["has_all_projects_access"] is True
    assert len(owner_member["project_access"]) == 0

    collab_member = next(m for m in members if m["firebase_uid"] == collaborator_user.firebase_uid)
    assert collab_member["role"] == UserRoleEnum.COLLABORATOR.value
    assert collab_member["has_all_projects_access"] is True
    assert len(collab_member["project_access"]) == 0

    limited_member = next(m for m in members if m["firebase_uid"] == limited_collaborator_user.firebase_uid)
    assert limited_member["role"] == UserRoleEnum.COLLABORATOR.value
    assert limited_member["has_all_projects_access"] is False
    assert len(limited_member["project_access"]) == 1
    assert limited_member["project_access"][0]["project_id"] == str(project.id)
    assert limited_member["project_access"][0]["project_name"] == project.name


async def test_list_organization_members_organization_not_found(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_org_id = uuid4()
    response = await test_client.get(
        f"/organizations/{non_existent_org_id}/members",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_add_organization_member_success(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    new_member_uid = "d" * 128

    response = await test_client.post(
        f"/organizations/{organization.id}/members",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "firebase_uid": new_member_uid,
            "role": UserRoleEnum.ADMIN.value,
            "has_all_projects_access": True,
        },
    )

    assert response.status_code == HTTPStatus.CREATED
    result = response.json()
    assert result["message"] == "Member added successfully"
    assert result["firebase_uid"] == new_member_uid
    assert result["role"] == UserRoleEnum.ADMIN.value

    async with async_session_maker() as session:
        member = await session.scalar(
            select(OrganizationUser)
            .where(OrganizationUser.organization_id == organization.id)
            .where(OrganizationUser.firebase_uid == new_member_uid)
        )
        assert member is not None
        assert member.role == UserRoleEnum.ADMIN
        assert member.has_all_projects_access is True


async def test_add_organization_member_collaborator_with_limited_access(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    new_member_uid = "e" * 128

    response = await test_client.post(
        f"/organizations/{organization.id}/members",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "firebase_uid": new_member_uid,
            "role": UserRoleEnum.COLLABORATOR.value,
            "has_all_projects_access": False,
        },
    )

    assert response.status_code == HTTPStatus.CREATED
    result = response.json()
    assert result["firebase_uid"] == new_member_uid
    assert result["role"] == UserRoleEnum.COLLABORATOR.value

    async with async_session_maker() as session:
        member = await session.scalar(
            select(OrganizationUser)
            .where(OrganizationUser.organization_id == organization.id)
            .where(OrganizationUser.firebase_uid == new_member_uid)
        )
        assert member is not None
        assert member.role == UserRoleEnum.COLLABORATOR
        assert member.has_all_projects_access is False


async def test_add_organization_member_already_exists(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    collaborator_user: OrganizationUser,
    otp_code: str,
) -> None:
    response = await test_client.post(
        f"/organizations/{organization.id}/members",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "firebase_uid": collaborator_user.firebase_uid,
            "role": UserRoleEnum.ADMIN.value,
        },
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "already a member" in response.json()["detail"].lower()


async def test_add_organization_member_organization_not_found(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_org_id = uuid4()

    response = await test_client.post(
        f"/organizations/{non_existent_org_id}/members",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "firebase_uid": "new_uid",
            "role": UserRoleEnum.COLLABORATOR.value,
        },
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_member_role_to_admin(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    collaborator_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.patch(
        f"/organizations/{organization.id}/members/{collaborator_user.firebase_uid}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.ADMIN.value,
            "has_all_projects_access": True,
        },
    )

    assert response.status_code == HTTPStatus.OK
    result = response.json()
    assert result["message"] == "Member role updated successfully"
    assert result["firebase_uid"] == collaborator_user.firebase_uid
    assert result["role"] == UserRoleEnum.ADMIN.value

    async with async_session_maker() as session:
        member = await session.scalar(
            select(OrganizationUser)
            .where(OrganizationUser.organization_id == organization.id)
            .where(OrganizationUser.firebase_uid == collaborator_user.firebase_uid)
        )
        assert member is not None
        assert member.role == UserRoleEnum.ADMIN
        assert member.has_all_projects_access is True


async def test_update_member_role_collaborator_with_project_access(
    test_client: TestingClientType,
    organization: Organization,
    project: Project,
    project_owner_user: OrganizationUser,
    collaborator_user: OrganizationUser,
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

    response = await test_client.patch(
        f"/organizations/{organization.id}/members/{collaborator_user.firebase_uid}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.COLLABORATOR.value,
            "has_all_projects_access": False,
            "project_ids": [str(project.id), str(project2_id)],
        },
    )

    assert response.status_code == HTTPStatus.OK

    async with async_session_maker() as session:
        access_count = await session.scalar(
            select(func.count())
            .select_from(ProjectAccess)
            .where(ProjectAccess.firebase_uid == collaborator_user.firebase_uid)
            .where(ProjectAccess.organization_id == organization.id)
        )
        assert access_count == 2


async def test_update_member_role_cannot_update_self(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    firebase_uid: str,
    otp_code: str,
) -> None:
    response = await test_client.patch(
        f"/organizations/{organization.id}/members/{firebase_uid}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.COLLABORATOR.value,
        },
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "cannot update your own role" in response.json()["detail"].lower()


async def test_update_member_role_admin_cannot_promote_to_owner(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    collaborator_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    admin_uid = "d" * 128
    async with async_session_maker() as session, session.begin():
        admin_user = OrganizationUser(
            firebase_uid=admin_uid,
            organization_id=organization.id,
            role=UserRoleEnum.ADMIN,
            has_all_projects_access=True,
        )
        session.add(admin_user)
        await session.commit()

    from services.backend.src.utils.jwt import create_jwt

    admin_otp = create_jwt(admin_uid)

    response = await test_client.patch(
        f"/organizations/{organization.id}/members/{collaborator_user.firebase_uid}",
        headers={"Authorization": f"Bearer {admin_otp}"},
        json={
            "role": UserRoleEnum.OWNER.value,
        },
    )

    assert response.status_code == HTTPStatus.OK


async def test_update_member_role_member_not_found(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_uid = "nonexistent123"

    response = await test_client.patch(
        f"/organizations/{organization.id}/members/{non_existent_uid}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.ADMIN.value,
        },
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "member not found" in response.json()["detail"].lower()


async def test_remove_member_success(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    collaborator_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/organizations/{organization.id}/members/{collaborator_user.firebase_uid}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        member = await session.scalar(
            select(OrganizationUser)
            .where(OrganizationUser.organization_id == organization.id)
            .where(OrganizationUser.firebase_uid == collaborator_user.firebase_uid)
        )
        assert member is None


async def test_remove_member_cannot_remove_self(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    firebase_uid: str,
    otp_code: str,
) -> None:
    response = await test_client.delete(
        f"/organizations/{organization.id}/members/{firebase_uid}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "cannot remove yourself" in response.json()["detail"].lower()


async def test_remove_member_cannot_remove_owner(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    other_owner_uid = "f" * 128
    async with async_session_maker() as session, session.begin():
        other_owner = OrganizationUser(
            firebase_uid=other_owner_uid,
            organization_id=organization.id,
            role=UserRoleEnum.OWNER,
            has_all_projects_access=True,
        )
        session.add(other_owner)
        await session.commit()

    from services.backend.src.utils.jwt import create_jwt

    other_owner_otp = create_jwt(other_owner_uid)

    response = await test_client.delete(
        f"/organizations/{organization.id}/members/{project_owner_user.firebase_uid}",
        headers={"Authorization": f"Bearer {other_owner_otp}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST

    error_detail = response.json()["detail"].lower()
    assert "cannot remove" in error_detail
    assert "yourself" in error_detail or "owner" in error_detail


async def test_remove_member_not_found(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_uid = "nonexistent456"

    response = await test_client.delete(
        f"/organizations/{organization.id}/members/{non_existent_uid}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "member not found" in response.json()["detail"].lower()


async def test_remove_member_organization_not_found(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_org_id = uuid4()

    response = await test_client.delete(
        f"/organizations/{non_existent_org_id}/members/someuser123",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_list_members_as_collaborator(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    collaborator_user: OrganizationUser,
    second_user_uid: str,
) -> None:
    from services.backend.src.utils.jwt import create_jwt

    collab_otp = create_jwt(second_user_uid)

    response = await test_client.get(
        f"/organizations/{organization.id}/members",
        headers={"Authorization": f"Bearer {collab_otp}"},
    )

    assert response.status_code == HTTPStatus.OK
    members = response.json()
    assert len(members) >= 2


async def test_add_member_as_collaborator_forbidden(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    collaborator_user: OrganizationUser,
    second_user_uid: str,
) -> None:
    from services.backend.src.utils.jwt import create_jwt

    collab_otp = create_jwt(second_user_uid)

    response = await test_client.post(
        f"/organizations/{organization.id}/members",
        headers={"Authorization": f"Bearer {collab_otp}"},
        json={
            "firebase_uid": "newuser123",
            "role": UserRoleEnum.COLLABORATOR.value,
            "has_all_projects_access": True,
        },
    )

    assert response.status_code == HTTPStatus.CREATED


async def test_add_member_database_error(
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
        f"/organizations/{organization.id}/members",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "firebase_uid": "newuser789",
            "role": UserRoleEnum.COLLABORATOR.value,
            "has_all_projects_access": True,
        },
    )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "database" in response.json()["detail"].lower()


async def test_update_member_role_database_error(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    collaborator_user: OrganizationUser,
    otp_code: str,
    mocker: Any,
) -> None:
    mocker.patch(
        "sqlalchemy.ext.asyncio.AsyncSession.commit",
        side_effect=SQLAlchemyError("Database error"),
    )

    response = await test_client.patch(
        f"/organizations/{organization.id}/members/{collaborator_user.firebase_uid}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.ADMIN.value,
            "has_all_projects_access": True,
        },
    )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "database" in response.json()["detail"].lower()


async def test_remove_member_database_error(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    collaborator_user: OrganizationUser,
    otp_code: str,
    mocker: Any,
) -> None:
    mocker.patch(
        "sqlalchemy.ext.asyncio.AsyncSession.commit",
        side_effect=SQLAlchemyError("Database error"),
    )

    response = await test_client.delete(
        f"/organizations/{organization.id}/members/{collaborator_user.firebase_uid}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "database" in response.json()["detail"].lower()


async def test_update_member_role_collaborator_remove_project_access(
    test_client: TestingClientType,
    organization: Organization,
    project_owner_user: OrganizationUser,
    limited_collaborator_user: OrganizationUser,
    otp_code: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.patch(
        f"/organizations/{organization.id}/members/{limited_collaborator_user.firebase_uid}",
        headers={"Authorization": f"Bearer {otp_code}"},
        json={
            "role": UserRoleEnum.COLLABORATOR.value,
            "has_all_projects_access": True,
        },
    )

    assert response.status_code == HTTPStatus.OK

    async with async_session_maker() as session:
        access_count = await session.scalar(
            select(func.count())
            .select_from(ProjectAccess)
            .where(ProjectAccess.firebase_uid == limited_collaborator_user.firebase_uid)
            .where(ProjectAccess.organization_id == organization.id)
        )
        assert access_count == 0
