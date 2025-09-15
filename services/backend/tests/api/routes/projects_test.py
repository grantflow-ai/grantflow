from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any

import pytest
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import GrantApplication, Organization, OrganizationInvitation, OrganizationUser, Project
from packages.shared_utils.src.exceptions import DatabaseError
from pytest_mock import MockerFixture
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    GrantApplicationFactory,
    OrganizationFactory,
    ProjectFactory,
)

from services.backend.src.api.routes.projects import (
    CreateInvitationRedirectUrlRequestBody,
    UpdateMemberRoleRequestBody,
    UpdateProjectRequestBody,
)
from services.backend.tests.conftest import TestingClientType
from services.backend.tests.factories import CreateProjectRequestBodyFactory


async def test_create_project_success(
    test_client: TestingClientType,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    organization = OrganizationFactory.build()
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(Organization).values(
                id=organization.id,
                name=organization.name,
                description=organization.description,
                logo_url=organization.logo_url,
                contact_email=organization.contact_email,
                contact_person_name=organization.contact_person_name,
                institutional_affiliation=organization.institutional_affiliation,
            )
        )
        await session.commit()

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                organization_id=organization.id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.OWNER,
                has_all_projects_access=True,
            )
        )
        await session.commit()

    request_body = CreateProjectRequestBodyFactory.build()
    response = await test_client.post(
        f"/organizations/{organization.id}/projects",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    response_body = response.json()
    assert response_body["id"]

    async with async_session_maker() as session, session.begin():
        project = await session.scalar(select(Project).where(Project.id == response_body["id"]))

        assert project.name == request_body["name"]
        assert project.description == request_body["description"]
        assert project.logo_url == request_body["logo_url"]
        assert project.organization_id == organization.id


async def test_create_project_failure(
    test_client: TestingClientType,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    organization = OrganizationFactory.build()
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(Organization).values(
                id=organization.id,
                name=organization.name,
                description=organization.description,
            )
        )
        await session.commit()

    response = await test_client.post(
        f"/organizations/{organization.id}/projects",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


async def test_retrieve_projects(
    test_client: TestingClientType,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    organization = OrganizationFactory.build()
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(Organization).values(
                id=organization.id,
                name=organization.name,
                description=organization.description,
            )
        )
        await session.commit()

    projects_data = ProjectFactory.batch(4, organization_id=organization.id)
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(Project).values(
                [
                    {
                        "id": value.id,
                        "name": value.name,
                        "description": value.description,
                        "logo_url": value.logo_url,
                        "organization_id": organization.id,
                    }
                    for value in projects_data
                ]
            )
        )
        await session.commit()

    projects_data[:3]
    projects_data[3]

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                {
                    "organization_id": organization.id,
                    "firebase_uid": firebase_uid,
                    "role": UserRoleEnum.OWNER,
                    "has_all_projects_access": True,
                }
            )
        )
        await session.commit()

    firebase_users = {
        firebase_uid: {
            "uid": firebase_uid,
            "email": f"test-{firebase_uid}@example.com",
            "displayName": f"Test User {firebase_uid}",
            "photoURL": f"https://example.com/photo-{firebase_uid}.jpg",
        }
    }
    mocker.patch(
        "services.backend.src.api.routes.projects.get_users",
        return_value=firebase_users,
    )

    response = await test_client.get(
        f"/organizations/{organization.id}/projects",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text

    values = response.json()

    for _idx, _proj in enumerate(values):
        pass

    assert len(values) == 4

    for project in projects_data:
        project_response = next(value for value in values if value["id"] == str(project.id))
        assert project_response["name"] == project.name
        assert project_response["description"] == project.description
        assert project_response["logo_url"] == project.logo_url
        assert "members" in project_response
        assert len(project_response["members"]) > 0

        user_member = next(m for m in project_response["members"] if m["firebase_uid"] == firebase_uid)
        assert user_member["email"] == f"test-{firebase_uid}@example.com"
        assert user_member["role"] == UserRoleEnum.OWNER.value

        members = project_response["members"]
        assert len(members) == 1

        member = members[0]
        assert member["firebase_uid"] == firebase_uid
        assert member["email"] == f"test-{firebase_uid}@example.com"
        assert member["display_name"] == f"Test User {firebase_uid}"
        assert member["photo_url"] == f"https://example.com/photo-{firebase_uid}.jpg"


async def test_retrieve_projects_excludes_deleted_applications(
    test_client: TestingClientType,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    organization = OrganizationFactory.build()
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(Organization).values(
                id=organization.id,
                name=organization.name,
                description=organization.description,
            )
        )
        await session.commit()

    project = ProjectFactory.build(organization_id=organization.id)
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(Project).values(
                id=project.id,
                name=project.name,
                description=project.description,
                logo_url=project.logo_url,
                organization_id=organization.id,
            )
        )
        await session.commit()

    applications = GrantApplicationFactory.batch(3, project_id=project.id)
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(GrantApplication).values(
                [
                    {
                        "id": app.id,
                        "title": app.title,
                        "description": app.description,
                        "project_id": project.id,
                        "status": app.status,
                    }
                    for app in applications
                ]
            )
        )
        await session.commit()

    async with async_session_maker() as session, session.begin():
        await session.execute(
            update(GrantApplication)
            .where(GrantApplication.id == applications[2].id)
            .values(deleted_at=datetime.now(UTC))
        )
        await session.commit()

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                {
                    "organization_id": organization.id,
                    "firebase_uid": firebase_uid,
                    "role": UserRoleEnum.OWNER,
                    "has_all_projects_access": True,
                }
            )
        )
        await session.commit()

    firebase_users = {
        firebase_uid: {
            "uid": firebase_uid,
            "email": f"test-{firebase_uid}@example.com",
            "displayName": f"Test User {firebase_uid}",
            "photoURL": f"https://example.com/photo-{firebase_uid}.jpg",
        }
    }
    mocker.patch(
        "services.backend.src.api.routes.projects.get_users",
        return_value=firebase_users,
    )

    response = await test_client.get(
        f"/organizations/{organization.id}/projects",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text

    values = response.json()
    assert len(values) == 1

    project_response = values[0]
    assert project_response["id"] == str(project.id)
    assert project_response["applications_count"] == 2


@pytest.mark.parametrize("user_role", (UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR))
async def test_retrieve_project_success(
    test_client: TestingClientType,
    project: Project,
    user_role: UserRoleEnum,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            sa_delete(OrganizationUser).where(
                OrganizationUser.organization_id == project.organization_id,
                OrganizationUser.firebase_uid == firebase_uid,
            )
        )

        await session.execute(
            insert(OrganizationUser).values(
                organization_id=project.organization_id,
                firebase_uid=firebase_uid,
                role=user_role,
                has_all_projects_access=True,
            )
        )
        await session.commit()

    mocker.patch(
        "services.backend.src.api.routes.projects.get_users",
        return_value={
            firebase_uid: {
                "uid": firebase_uid,
                "email": f"test-{firebase_uid}@example.com",
                "displayName": f"Test User {firebase_uid}",
                "photoURL": f"https://example.com/photo-{firebase_uid}.jpg",
            }
        },
    )

    grant_app1 = GrantApplicationFactory.build(
        project_id=project.id,
        title="Application 1",
        completed_at=datetime.now(UTC),
    )
    grant_app2 = GrantApplicationFactory.build(
        project_id=project.id,
        title="Application 2",
        completed_at=None,
    )

    async with async_session_maker() as session, session.begin():
        session.add(grant_app1)
        session.add(grant_app2)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text

    response_data = response.json()
    assert response_data["id"] == str(project.id)
    assert response_data["name"] == project.name
    assert response_data["description"] == project.description
    assert response_data["logo_url"] == project.logo_url
    assert response_data["role"] == user_role.value

    grant_applications = response_data["grant_applications"]
    assert len(grant_applications) == 2

    app_ids = {str(grant_app1.id), str(grant_app2.id)}
    response_app_ids = {app["id"] for app in grant_applications}
    assert app_ids == response_app_ids

    for app in grant_applications:
        if app["id"] == str(grant_app1.id):
            assert app["title"] == "Application 1"
            assert app["completed_at"] is not None
        elif app["id"] == str(grant_app2.id):
            assert app["title"] == "Application 2"
            assert app["completed_at"] is None

    members = response_data["members"]
    assert len(members) == 1
    assert members[0]["firebase_uid"] == firebase_uid
    assert members[0]["role"] == user_role.value
    assert members[0]["email"] == f"test-{firebase_uid}@example.com"
    assert members[0]["display_name"] == f"Test User {firebase_uid}"
    assert members[0]["photo_url"] == f"https://example.com/photo-{firebase_uid}.jpg"


async def test_retrieve_project_unauthorized(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}",
        headers={"Authorization": "Bearer invalid_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


@pytest.mark.parametrize("user_role", (UserRoleEnum.OWNER, UserRoleEnum.ADMIN))
@pytest.mark.parametrize(
    "request_body, attrs",
    (
        (UpdateProjectRequestBody(name="new_name"), ("name",)),
        (UpdateProjectRequestBody(description="new_description"), ("description",)),
        (UpdateProjectRequestBody(logo_url="new_logo_url"), ("logo_url",)),
        (
            UpdateProjectRequestBody(name="new_name", description="new_description"),
            ("name", "description"),
        ),
        (
            UpdateProjectRequestBody(name="new_name", logo_url="new_logo_url"),
            ("name", "logo_url"),
        ),
        (
            UpdateProjectRequestBody(description="new_description", logo_url="new_logo_url"),
            ("description", "logo_url"),
        ),
    ),
)
async def test_update_project_success(
    test_client: TestingClientType,
    project: Project,
    user_role: UserRoleEnum,
    request_body: UpdateProjectRequestBody,
    attrs: tuple[str, ...],
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        if user_role == UserRoleEnum.OWNER:
            await session.execute(
                insert(OrganizationUser).values(
                    organization_id=project.organization_id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.OWNER.value,
                    has_all_projects_access=True,
                )
            )
        else:
            await session.execute(
                insert(OrganizationUser).values(
                    organization_id=project.organization_id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.ADMIN.value,
                    has_all_projects_access=True,
                )
            )
        await session.commit()

    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text

    async with async_session_maker() as session, session.begin():
        project = await session.scalar(select(Project).where(Project.id == project.id))

    for attr in attrs:
        assert getattr(project, attr) == request_body[attr]  # type: ignore[literal-required]


async def test_update_project_failure_unauthorized(
    test_client: TestingClientType,
    project: Project,
    project_member_user: None,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}",
        json=UpdateProjectRequestBody(name="new_name"),
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


async def test_delete_project_success(
    test_client: TestingClientType,
    project: Project,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        deleted_project = await session.scalar(select(Project).where(Project.id == project.id))
        assert deleted_project is not None
        assert deleted_project.deleted_at is not None


@pytest.mark.parametrize("user_role", (UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR))
async def test_delete_project_failure_unauthorized(
    test_client: TestingClientType,
    project: Project,
    user_role: UserRoleEnum,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        if user_role == UserRoleEnum.ADMIN:
            await session.execute(
                insert(OrganizationUser).values(
                    organization_id=project.organization_id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.ADMIN.value,
                    has_all_projects_access=True,
                )
            )
        else:
            await session.execute(
                insert(OrganizationUser).values(
                    organization_id=project.organization_id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.COLLABORATOR.value,
                    has_all_projects_access=True,
                )
            )
        await session.commit()

    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


@pytest.mark.parametrize("user_role", (UserRoleEnum.ADMIN,))
async def test_create_invitation_redirect_url_selected_role_lower_than_or_equals_inviter_role(
    test_client: TestingClientType,
    project: Project,
    user_role: UserRoleEnum,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    mocker.patch("services.backend.src.utils.firebase.get_user_by_email", return_value=None)

    async with async_session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(OrganizationUser).values(
                    organization_id=project.organization_id,
                    firebase_uid=firebase_uid,
                    role=user_role.value,
                    has_all_projects_access=True,
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            raise e

    request_body = CreateInvitationRedirectUrlRequestBody(email="invitation-test@example.com", role=UserRoleEnum.OWNER)

    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/create-invitation-redirect-url",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "role must be equal to or lower than the inviter's role" in response.json()["detail"].lower()


async def test_create_invitation_redirect_url_user_already_member(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.backend.src.api.routes.projects.get_user_by_email",
        return_value={"uid": "existing_user_uid", "email": "invitation-test@example.com"},
    )

    async with async_session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(OrganizationUser).values(
                    organization_id=project.organization_id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.ADMIN,
                    has_all_projects_access=True,
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            raise e

    async with async_session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(OrganizationUser).values(
                    organization_id=project.organization_id,
                    firebase_uid="existing_user_uid",
                    role=UserRoleEnum.COLLABORATOR,
                    has_all_projects_access=True,
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            raise e

    request_body = CreateInvitationRedirectUrlRequestBody(
        email="invitation-test@example.com", role=UserRoleEnum.COLLABORATOR
    )

    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/create-invitation-redirect-url",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "user is already a member of this organization" in response.json()["detail"].lower()


async def test_create_invitation_redirect_url_success(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.backend.src.api.routes.projects.get_user_by_email",
        return_value={"uid": "new_user_uid", "email": "invitation-test@example.com"},
    )

    async with async_session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(OrganizationUser).values(
                    organization_id=project.organization_id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.ADMIN,
                    has_all_projects_access=True,
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            raise e

    request_body = CreateInvitationRedirectUrlRequestBody(
        email="invitation-test@example.com", role=UserRoleEnum.COLLABORATOR
    )

    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/create-invitation-redirect-url",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.CREATED, response.text
    response_data = response.json()
    assert "token" in response_data
    assert isinstance(response_data["token"], str)
    assert len(response_data["token"]) > 0

    async with async_session_maker() as session:
        invitation = await session.scalar(
            select(OrganizationInvitation)
            .where(OrganizationInvitation.organization_id == project.organization_id)
            .where(OrganizationInvitation.email == "invitation-test@example.com")
        )
        assert invitation is not None
        assert invitation.role == UserRoleEnum.COLLABORATOR
        assert invitation.invitation_sent_at is not None


@pytest.mark.parametrize("user_role", (UserRoleEnum.OWNER, UserRoleEnum.ADMIN))
async def test_delete_invitation_success(
    test_client: TestingClientType,
    project: Project,
    user_role: UserRoleEnum,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(OrganizationUser).values(
                    {
                        "organization_id": project.organization_id,
                        "firebase_uid": firebase_uid,
                        "role": user_role.value,
                        "has_all_projects_access": True,
                    }
                )
            )

            invitation = await session.scalar(
                insert(OrganizationInvitation)
                .values(
                    {
                        "organization_id": project.organization_id,
                        "email": "invitation-test@example.com",
                        "role": UserRoleEnum.COLLABORATOR,
                        "invitation_sent_at": datetime.now(UTC),
                    }
                )
                .returning(OrganizationInvitation)
            )

            await session.commit()
        except SQLAlchemyError as e:
            raise DatabaseError("Error deleting invitation", context=str(e)) from e
    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}/invitations/{invitation.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        deleted_invitation = await session.scalar(
            select(OrganizationInvitation)
            .where(OrganizationInvitation.id == invitation.id)
            .where(OrganizationInvitation.organization_id == project.organization_id)
        )

        assert deleted_invitation is not None
        assert deleted_invitation.deleted_at is not None


async def test_delete_invitation_not_project_member(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(OrganizationInvitation)
            .values(
                {
                    "organization_id": project.organization_id,
                    "email": "invitation-test@example.com",
                    "role": UserRoleEnum.COLLABORATOR.value,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(OrganizationInvitation)
        )
        await session.commit()

    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}/invitations/{invitation.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED
    assert response.json()["detail"].lower() == "unauthorized"


@pytest.mark.parametrize("user_role", (UserRoleEnum.OWNER, UserRoleEnum.ADMIN))
async def test_delete_invitation_not_found(
    test_client: TestingClientType,
    project: Project,
    user_role: UserRoleEnum,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                organization_id=project.organization_id,
                firebase_uid=firebase_uid,
                role=user_role,
                has_all_projects_access=True,
            )
        )
        await session.commit()

    non_existent_invitation_id = "00000000-0000-0000-0000-000000000000"
    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}/invitations/{non_existent_invitation_id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "invitation not found" in response.json()["detail"].lower()


async def test_delete_invitation_unauthorized_role(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                organization_id=project.organization_id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.COLLABORATOR,
                has_all_projects_access=True,
            )
        )
        await session.commit()

    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(OrganizationInvitation)
            .values(
                {
                    "organization_id": project.organization_id,
                    "email": "invitation-test@example.com",
                    "role": UserRoleEnum.COLLABORATOR,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(OrganizationInvitation)
        )
        await session.commit()

    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}/invitations/{invitation.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text
    assert response.json()["detail"].lower() == "unauthorized"


@pytest.mark.parametrize("user_role", (UserRoleEnum.OWNER, UserRoleEnum.ADMIN))
async def test_update_invitation_role_success(
    test_client: TestingClientType,
    project: Project,
    user_role: UserRoleEnum,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(OrganizationUser).values(
                    organization_id=project.organization_id,
                    firebase_uid=firebase_uid,
                    role=user_role.value,
                    has_all_projects_access=True,
                )
            )

            invitation = await session.scalar(
                insert(OrganizationInvitation)
                .values(
                    {
                        "organization_id": project.organization_id,
                        "email": "invitation-test@example.com",
                        "role": UserRoleEnum.COLLABORATOR,
                        "invitation_sent_at": datetime.now(UTC),
                    }
                )
                .returning(OrganizationInvitation)
            )

            await session.commit()
        except SQLAlchemyError as e:
            raise e

    request_body = {"role": UserRoleEnum.ADMIN}

    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}/invitations/{invitation.id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text
    response_data = response.json()
    assert "token" in response_data
    assert isinstance(response_data["token"], str)
    assert len(response_data["token"]) > 0

    async with async_session_maker() as session:
        updated_invitation = await session.scalar(
            select(OrganizationInvitation)
            .where(OrganizationInvitation.id == invitation.id)
            .where(OrganizationInvitation.organization_id == project.organization_id)
        )
        assert updated_invitation is not None
        assert updated_invitation.role == UserRoleEnum.ADMIN


async def test_update_invitation_role_not_project_member(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(OrganizationInvitation)
            .values(
                {
                    "organization_id": project.organization_id,
                    "email": "invitation-test@example.com",
                    "role": UserRoleEnum.COLLABORATOR,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(OrganizationInvitation)
        )
        await session.commit()

    request_body = {"role": UserRoleEnum.ADMIN.value}

    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}/invitations/{invitation.id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED
    assert response.json()["detail"].lower() == "unauthorized"


@pytest.mark.parametrize("user_role", (UserRoleEnum.OWNER, UserRoleEnum.ADMIN))
async def test_update_invitation_role_not_found(
    test_client: TestingClientType,
    project: Project,
    user_role: UserRoleEnum,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                organization_id=project.organization_id,
                firebase_uid=firebase_uid,
                role=user_role,
                has_all_projects_access=True,
            )
        )
        await session.commit()

    non_existent_invitation_id = "00000000-0000-0000-0000-000000000000"
    request_body = {"role": UserRoleEnum.ADMIN.value}

    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}/invitations/{non_existent_invitation_id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "invitation not found" in response.json()["detail"].lower()


async def test_update_invitation_role_unauthorized_role(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                organization_id=project.organization_id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.COLLABORATOR,
                has_all_projects_access=True,
            )
        )
        await session.commit()

    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(OrganizationInvitation)
            .values(
                {
                    "organization_id": project.organization_id,
                    "email": "invitation-test@example.com",
                    "role": UserRoleEnum.COLLABORATOR,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(OrganizationInvitation)
        )
        await session.commit()

    request_body = {"role": UserRoleEnum.ADMIN.value}

    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}/invitations/{invitation.id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text
    assert response.json()["detail"].lower() == "unauthorized"


async def test_update_invitation_role_already_accepted(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                organization_id=project.organization_id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.ADMIN,
                has_all_projects_access=True,
            )
        )

        invitation = await session.scalar(
            insert(OrganizationInvitation)
            .values(
                {
                    "organization_id": project.organization_id,
                    "email": "invitation-test@example.com",
                    "role": UserRoleEnum.COLLABORATOR,
                    "invitation_sent_at": datetime.now(UTC),
                    "accepted_at": datetime.now(UTC),
                }
            )
            .returning(OrganizationInvitation)
        )

        await session.commit()

    request_body = {"role": UserRoleEnum.ADMIN.value}

    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}/invitations/{invitation.id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "cannot update role of an accepted invitation" in response.json()["detail"].lower()


async def test_update_invitation_role_higher_than_inviter(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                organization_id=project.organization_id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.ADMIN,
                has_all_projects_access=True,
            )
        )

        invitation = await session.scalar(
            insert(OrganizationInvitation)
            .values(
                {
                    "organization_id": project.organization_id,
                    "email": "invitation-test@example.com",
                    "role": UserRoleEnum.COLLABORATOR,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(OrganizationInvitation)
        )

        await session.commit()

    request_body = {"role": UserRoleEnum.OWNER}

    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}/invitations/{invitation.id}",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "role must be equal to or lower than the inviter's role" in response.json()["detail"].lower()


async def test_accept_invitation_success(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.backend.src.api.routes.projects.get_user_by_email",
        return_value={"uid": firebase_uid, "email": "invitation-test@example.com"},
    )

    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(OrganizationInvitation)
            .values(
                {
                    "organization_id": project.organization_id,
                    "email": "invitation-test@example.com",
                    "role": UserRoleEnum.COLLABORATOR,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(OrganizationInvitation)
        )
        await session.commit()

    response = await test_client.post(
        f"/projects/invitations/{invitation.id}/accept",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text
    response_data = response.json()
    assert "token" in response_data
    assert isinstance(response_data["token"], str)
    assert len(response_data["token"]) > 0

    async with async_session_maker() as session:
        project_user = await session.scalar(
            select(OrganizationUser)
            .where(OrganizationUser.organization_id == project.organization_id)
            .where(OrganizationUser.firebase_uid == firebase_uid)
        )
        assert project_user is not None
        assert project_user.role == UserRoleEnum.COLLABORATOR

        updated_invitation = await session.scalar(
            select(OrganizationInvitation).where(OrganizationInvitation.id == invitation.id)
        )
        assert updated_invitation is not None
        assert updated_invitation.accepted_at is not None


async def test_accept_invitation_not_found(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    non_existent_invitation_id = "00000000-0000-0000-0000-000000000000"
    response = await test_client.post(
        f"/projects/invitations/{non_existent_invitation_id}/accept",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "invitation not found" in response.json()["detail"].lower()


async def test_accept_invitation_already_accepted(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.backend.src.api.routes.projects.get_user_by_email",
        return_value={"uid": firebase_uid, "email": "invitation-test@example.com"},
    )

    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(OrganizationInvitation)
            .values(
                {
                    "organization_id": project.organization_id,
                    "email": "invitation-test@example.com",
                    "role": UserRoleEnum.COLLABORATOR,
                    "invitation_sent_at": datetime.now(UTC),
                    "accepted_at": datetime.now(UTC),
                }
            )
            .returning(OrganizationInvitation)
        )
        await session.commit()

    response = await test_client.post(
        f"/projects/invitations/{invitation.id}/accept",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "invitation has already been accepted" in response.json()["detail"].lower()


async def test_accept_invitation_user_not_found(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.backend.src.api.routes.projects.get_user_by_email",
        return_value=None,
    )

    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(OrganizationInvitation)
            .values(
                {
                    "organization_id": project.organization_id,
                    "email": "invitation-test@example.com",
                    "role": UserRoleEnum.COLLABORATOR,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(OrganizationInvitation)
        )
        await session.commit()

    response = await test_client.post(
        f"/projects/invitations/{invitation.id}/accept",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "user not found in firebase" in response.json()["detail"].lower()


async def test_accept_invitation_wrong_user(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.backend.src.api.routes.projects.get_user_by_email",
        return_value={"uid": "different_user_uid", "email": "invitation-test@example.com"},
    )

    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(OrganizationInvitation)
            .values(
                {
                    "organization_id": project.organization_id,
                    "email": "invitation-test@example.com",
                    "role": UserRoleEnum.COLLABORATOR,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(OrganizationInvitation)
        )
        await session.commit()

    response = await test_client.post(
        f"/projects/invitations/{invitation.id}/accept",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "authenticated user does not match invitation email" in response.json()["detail"].lower()


async def test_list_project_members_success(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    firebase_users = {
        firebase_uid: {
            "uid": firebase_uid,
            "email": f"test-{firebase_uid}@example.com",
            "displayName": f"Test User {firebase_uid}",
            "photoURL": f"https://example.com/photo-{firebase_uid}.jpg",
        },
        "admin_uid": {
            "uid": "admin_uid",
            "email": "test-admin_uid@example.com",
            "displayName": "Test User admin_uid",
            "photoURL": "https://example.com/photo-admin_uid.jpg",
        },
        "member_uid": {
            "uid": "member_uid",
            "email": "test-member_uid@example.com",
        },
    }
    mocker.patch(
        "services.backend.src.api.routes.projects.get_users",
        return_value=firebase_users,
    )

    async with async_session_maker() as session, session.begin():
        await session.execute(
            sa_delete(OrganizationUser).where(OrganizationUser.organization_id == project.organization_id)
        )

        await session.execute(
            insert(OrganizationUser).values(
                [
                    {
                        "organization_id": project.organization_id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.OWNER,
                        "has_all_projects_access": True,
                    },
                    {
                        "organization_id": project.organization_id,
                        "firebase_uid": "admin_uid",
                        "role": UserRoleEnum.ADMIN,
                        "has_all_projects_access": True,
                    },
                    {
                        "organization_id": project.organization_id,
                        "firebase_uid": "member_uid",
                        "role": UserRoleEnum.COLLABORATOR,
                        "has_all_projects_access": True,
                    },
                ]
            )
        )
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/members",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text
    members = response.json()
    assert len(members) == 3

    owner = next(m for m in members if m["firebase_uid"] == firebase_uid)
    assert owner["email"] == f"test-{firebase_uid}@example.com"
    assert owner["display_name"] == f"Test User {firebase_uid}"
    assert owner["photo_url"] == f"https://example.com/photo-{firebase_uid}.jpg"
    assert owner["role"] == UserRoleEnum.OWNER.value

    admin = next(m for m in members if m["firebase_uid"] == "admin_uid")
    assert admin["email"] == "test-admin_uid@example.com"
    assert admin["display_name"] == "Test User admin_uid"
    assert admin["photo_url"] == "https://example.com/photo-admin_uid.jpg"
    assert admin["role"] == UserRoleEnum.ADMIN.value

    member = next(m for m in members if m["firebase_uid"] == "member_uid")
    assert member["email"] == "test-member_uid@example.com"
    assert member["display_name"] is None
    assert member["photo_url"] is None
    assert member["role"] == UserRoleEnum.COLLABORATOR.value


async def test_list_project_members_no_access(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    other_org = OrganizationFactory.build()
    other_project = ProjectFactory.build(organization_id=other_org.id)

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(Organization).values(
                id=other_org.id,
                name=other_org.name,
                description=other_org.description,
            )
        )

        await session.execute(
            insert(Project).values(
                id=other_project.id,
                name=other_project.name,
                description=other_project.description,
                organization_id=other_org.id,
            )
        )

        await session.execute(
            insert(OrganizationUser).values(
                organization_id=other_org.id,
                firebase_uid="other_user_uid",
                role=UserRoleEnum.OWNER,
            )
        )
        await session.commit()

    response = await test_client.get(
        f"/organizations/{other_project.organization_id}/projects/{other_project.id}/members",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_member_role_cannot_modify_owner(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    project_owner_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                {
                    "organization_id": project.organization_id,
                    "firebase_uid": "owner2_uid",
                    "role": UserRoleEnum.OWNER,
                    "has_all_projects_access": True,
                }
            )
        )
        await session.commit()

    request_body = UpdateMemberRoleRequestBody(role=UserRoleEnum.ADMIN)
    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}/members/owner2_uid",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "cannot modify owner role" in response.json()["detail"].lower()


async def test_update_member_role_only_owner_can_promote_to_admin(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                [
                    {
                        "organization_id": project.organization_id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.ADMIN,
                    },
                    {
                        "organization_id": project.organization_id,
                        "firebase_uid": "member_uid",
                        "role": UserRoleEnum.COLLABORATOR,
                    },
                ]
            )
        )
        await session.commit()

    request_body = UpdateMemberRoleRequestBody(role=UserRoleEnum.ADMIN)
    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}/members/member_uid",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "only owner can promote members to admin" in response.json()["detail"].lower()


async def test_update_member_role_member_not_found(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                organization_id=project.organization_id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.OWNER,
                has_all_projects_access=True,
            )
        )
        await session.commit()

    request_body = UpdateMemberRoleRequestBody(role=UserRoleEnum.ADMIN)
    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}/members/nonexistent_uid",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "member not found" in response.json()["detail"].lower()


async def test_remove_project_member_success(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                [
                    {
                        "organization_id": project.organization_id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.OWNER,
                    },
                    {
                        "organization_id": project.organization_id,
                        "firebase_uid": "member_uid",
                        "role": UserRoleEnum.COLLABORATOR,
                    },
                ]
            )
        )
        await session.commit()

    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}/members/member_uid",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        removed_member = await session.scalar(
            select(OrganizationUser)
            .where(OrganizationUser.organization_id == project.organization_id)
            .where(OrganizationUser.firebase_uid == "member_uid")
        )
        assert removed_member is None


async def test_remove_project_member_cannot_remove_owner(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                [
                    {
                        "organization_id": project.organization_id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.OWNER,
                    },
                    {
                        "organization_id": project.organization_id,
                        "firebase_uid": "owner2_uid",
                        "role": UserRoleEnum.OWNER,
                    },
                ]
            )
        )
        await session.commit()

    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}/members/owner2_uid",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "cannot remove owner" in response.json()["detail"].lower()


async def test_remove_project_member_only_owner_can_remove_admin(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                [
                    {
                        "organization_id": project.organization_id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.ADMIN,
                    },
                    {
                        "organization_id": project.organization_id,
                        "firebase_uid": "admin2_uid",
                        "role": UserRoleEnum.ADMIN,
                    },
                ]
            )
        )
        await session.commit()

    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}/members/admin2_uid",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "only owner can remove admin" in response.json()["detail"].lower()


async def test_remove_project_member_not_found(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(OrganizationUser).values(
                organization_id=project.organization_id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.OWNER,
                has_all_projects_access=True,
            )
        )
        await session.commit()

    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}/members/nonexistent_uid",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "member not found" in response.json()["detail"].lower()
