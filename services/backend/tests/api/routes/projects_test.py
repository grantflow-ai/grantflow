from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any

import pytest
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Project, ProjectUser, UserProjectInvitation
from packages.shared_utils.src.exceptions import DatabaseError
from pytest_mock import MockerFixture
from sqlalchemy import insert, select
from sqlalchemy.exc import NoResultFound, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    GrantApplicationFactory,
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
    request_body = CreateProjectRequestBodyFactory.build()
    response = await test_client.post(
        "/projects",
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


async def test_create_project_failure(
    test_client: TestingClientType,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.post(
        "/projects",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text


async def test_retrieve_projects(
    test_client: TestingClientType,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    projects_data = ProjectFactory.batch(4)
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(Project).values(
                [
                    {
                        "id": value.id,
                        "name": value.name,
                        "description": value.description,
                        "logo_url": value.logo_url,
                    }
                    for value in projects_data
                ]
            )
        )
        await session.commit()

    projects_with_user_access = projects_data[:3]
    project_without_user_access = projects_data[3]

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(ProjectUser).values(
                [
                    {
                        "project_id": projects_with_user_access[0].id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.OWNER.value,
                    },
                    {
                        "project_id": projects_with_user_access[1].id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.ADMIN.value,
                    },
                    {
                        "project_id": projects_with_user_access[2].id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.MEMBER.value,
                    },
                ]
            )
        )
        await session.commit()

    response = await test_client.get(
        "/projects",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text

    values = response.json()
    assert len(values) == 3

    for project in projects_with_user_access:
        assert any(
            value["id"] == str(project.id)
            and value["name"] == project.name
            and value["description"] == project.description
            and value["logo_url"] == project.logo_url
            for value in values
        )

    assert all(value["id"] != str(project_without_user_access.id) for value in values)


@pytest.mark.parametrize("user_role", (UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.MEMBER))
async def test_retrieve_project_success(
    test_client: TestingClientType,
    project: Project,
    user_role: UserRoleEnum,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        if user_role == UserRoleEnum.OWNER:
            await session.execute(
                insert(ProjectUser).values(
                    project_id=project.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.OWNER.value,
                )
            )
        elif user_role == UserRoleEnum.ADMIN:
            await session.execute(
                insert(ProjectUser).values(
                    project_id=project.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.ADMIN.value,
                )
            )
        else:
            await session.execute(
                insert(ProjectUser).values(
                    project_id=project.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.MEMBER.value,
                )
            )
        await session.commit()

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
        f"/projects/{project.id}",
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


async def test_retrieve_project_unauthorized(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.get(
        f"/projects/{project.id}",
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
                insert(ProjectUser).values(
                    project_id=project.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.OWNER.value,
                )
            )
        else:
            await session.execute(
                insert(ProjectUser).values(
                    project_id=project.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.ADMIN.value,
                )
            )
        await session.commit()

    response = await test_client.patch(
        f"/projects/{project.id}",
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
        f"/projects/{project.id}",
        json=UpdateProjectRequestBody(name="new_name"),
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


async def test_delete_project_success(
    test_client: TestingClientType,
    project: Project,
    project_owner_user: None,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await test_client.delete(
        f"/projects/{project.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    with pytest.raises(NoResultFound):
        async with async_session_maker() as session, session.begin():
            await session.get_one(Project, project.id)


@pytest.mark.parametrize("user_role", (UserRoleEnum.ADMIN, UserRoleEnum.MEMBER))
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
                insert(ProjectUser).values(
                    project_id=project.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.ADMIN.value,
                )
            )
        else:
            await session.execute(
                insert(ProjectUser).values(
                    project_id=project.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.MEMBER.value,
                )
            )
        await session.commit()

    response = await test_client.delete(
        f"/projects/{project.id}",
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
                insert(ProjectUser).values(
                    project_id=project.id,
                    firebase_uid=firebase_uid,
                    role=user_role.value,
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            raise e

    request_body = CreateInvitationRedirectUrlRequestBody(email="test@example.com", role=UserRoleEnum.OWNER)

    response = await test_client.post(
        f"/projects/{project.id}/create-invitation-redirect-url",
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
        return_value={"uid": "existing_user_uid", "email": "test@example.com"},
    )

    async with async_session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(ProjectUser).values(
                    project_id=project.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.ADMIN,
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            raise e

    async with async_session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(ProjectUser).values(
                    project_id=project.id,
                    firebase_uid="existing_user_uid",
                    role=UserRoleEnum.MEMBER,
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            raise e

    request_body = CreateInvitationRedirectUrlRequestBody(email="test@example.com", role=UserRoleEnum.MEMBER)

    response = await test_client.post(
        f"/projects/{project.id}/create-invitation-redirect-url",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "user is already a member of this project" in response.json()["detail"].lower()


async def test_create_invitation_redirect_url_success(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.backend.src.api.routes.projects.get_user_by_email",
        return_value={"uid": "new_user_uid", "email": "new_user@example.com"},
    )

    async with async_session_maker() as session, session.begin():
        try:
            await session.execute(
                insert(ProjectUser).values(
                    project_id=project.id,
                    firebase_uid=firebase_uid,
                    role=UserRoleEnum.ADMIN,
                )
            )
            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            raise e

    request_body = CreateInvitationRedirectUrlRequestBody(email="new_user@example.com", role=UserRoleEnum.MEMBER)

    response = await test_client.post(
        f"/projects/{project.id}/create-invitation-redirect-url",
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
            select(UserProjectInvitation)
            .where(UserProjectInvitation.project_id == project.id)
            .where(UserProjectInvitation.email == "new_user@example.com")
        )
        assert invitation is not None
        assert invitation.role == UserRoleEnum.MEMBER
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
            project = await session.scalar(
                insert(Project)
                .values(
                    {
                        "name": "Test Project",
                        "description": "A project for testing",
                        "logo_url": None,
                    }
                )
                .returning(Project)
            )

            await session.execute(
                insert(ProjectUser).values(
                    {
                        "project_id": project.id,
                        "firebase_uid": firebase_uid,
                        "role": user_role.value,
                    }
                )
            )

            invitation = await session.scalar(
                insert(UserProjectInvitation)
                .values(
                    {
                        "project_id": project.id,
                        "email": "test@example.com",
                        "role": UserRoleEnum.MEMBER,
                        "invitation_sent_at": datetime.now(UTC),
                    }
                )
                .returning(UserProjectInvitation)
            )

            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            raise DatabaseError("Error deleting invitation", context=str(e)) from e
    response = await test_client.delete(
        f"/projects/{project.id}/invitations/{invitation.id}",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        deleted_invitation = await session.scalar(
            select(UserProjectInvitation)
            .where(UserProjectInvitation.id == invitation.id)
            .where(UserProjectInvitation.project_id == project.id)
        )
        assert deleted_invitation is None


async def test_delete_invitation_not_project_member(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(UserProjectInvitation)
            .values(
                {
                    "project_id": project.id,
                    "email": "test@example.com",
                    "role": UserRoleEnum.MEMBER.value,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(UserProjectInvitation)
        )
        await session.commit()

    response = await test_client.delete(
        f"/projects/{project.id}/invitations/{invitation.id}",
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
            insert(ProjectUser).values(
                project_id=project.id,
                firebase_uid=firebase_uid,
                role=user_role,
            )
        )
        await session.commit()

    non_existent_invitation_id = "00000000-0000-0000-0000-000000000000"
    response = await test_client.delete(
        f"/projects/{project.id}/invitations/{non_existent_invitation_id}",
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
            insert(ProjectUser).values(
                project_id=project.id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.MEMBER,
            )
        )
        await session.commit()

    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(UserProjectInvitation)
            .values(
                {
                    "project_id": project.id,
                    "email": "test@example.com",
                    "role": UserRoleEnum.MEMBER,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(UserProjectInvitation)
        )
        await session.commit()

    response = await test_client.delete(
        f"/projects/{project.id}/invitations/{invitation.id}",
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
                insert(ProjectUser).values(
                    project_id=project.id,
                    firebase_uid=firebase_uid,
                    role=user_role.value,
                )
            )

            invitation = await session.scalar(
                insert(UserProjectInvitation)
                .values(
                    {
                        "project_id": project.id,
                        "email": "test@example.com",
                        "role": UserRoleEnum.MEMBER,
                        "invitation_sent_at": datetime.now(UTC),
                    }
                )
                .returning(UserProjectInvitation)
            )

            await session.commit()
        except SQLAlchemyError as e:
            await session.rollback()
            raise e

    request_body = {"role": UserRoleEnum.ADMIN}

    response = await test_client.patch(
        f"/projects/{project.id}/invitations/{invitation.id}",
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
            select(UserProjectInvitation)
            .where(UserProjectInvitation.id == invitation.id)
            .where(UserProjectInvitation.project_id == project.id)
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
            insert(UserProjectInvitation)
            .values(
                {
                    "project_id": project.id,
                    "email": "test@example.com",
                    "role": UserRoleEnum.MEMBER,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(UserProjectInvitation)
        )
        await session.commit()

    request_body = {"role": UserRoleEnum.ADMIN.value}

    response = await test_client.patch(
        f"/projects/{project.id}/invitations/{invitation.id}",
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
            insert(ProjectUser).values(
                project_id=project.id,
                firebase_uid=firebase_uid,
                role=user_role,
            )
        )
        await session.commit()

    non_existent_invitation_id = "00000000-0000-0000-0000-000000000000"
    request_body = {"role": UserRoleEnum.ADMIN.value}

    response = await test_client.patch(
        f"/projects/{project.id}/invitations/{non_existent_invitation_id}",
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
            insert(ProjectUser).values(
                project_id=project.id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.MEMBER,
            )
        )
        await session.commit()

    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(UserProjectInvitation)
            .values(
                {
                    "project_id": project.id,
                    "email": "test@example.com",
                    "role": UserRoleEnum.MEMBER,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(UserProjectInvitation)
        )
        await session.commit()

    request_body = {"role": UserRoleEnum.ADMIN.value}

    response = await test_client.patch(
        f"/projects/{project.id}/invitations/{invitation.id}",
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
            insert(ProjectUser).values(
                project_id=project.id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.ADMIN,
            )
        )

        invitation = await session.scalar(
            insert(UserProjectInvitation)
            .values(
                {
                    "project_id": project.id,
                    "email": "test@example.com",
                    "role": UserRoleEnum.MEMBER,
                    "invitation_sent_at": datetime.now(UTC),
                    "accepted_at": datetime.now(UTC),
                }
            )
            .returning(UserProjectInvitation)
        )

        await session.commit()

    request_body = {"role": UserRoleEnum.ADMIN.value}

    response = await test_client.patch(
        f"/projects/{project.id}/invitations/{invitation.id}",
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
            insert(ProjectUser).values(
                project_id=project.id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.ADMIN,
            )
        )

        invitation = await session.scalar(
            insert(UserProjectInvitation)
            .values(
                {
                    "project_id": project.id,
                    "email": "test@example.com",
                    "role": UserRoleEnum.MEMBER,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(UserProjectInvitation)
        )

        await session.commit()

    request_body = {"role": UserRoleEnum.OWNER}

    response = await test_client.patch(
        f"/projects/{project.id}/invitations/{invitation.id}",
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
        return_value={"uid": firebase_uid, "email": "test@example.com"},
    )

    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(UserProjectInvitation)
            .values(
                {
                    "project_id": project.id,
                    "email": "test@example.com",
                    "role": UserRoleEnum.MEMBER,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(UserProjectInvitation)
        )
        await session.commit()

    response = await test_client.post(
        f"/projects/invitations/{invitation.id}/accept",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text
    response_data = response.json()
    assert "token" in response_data
    assert isinstance(response_data["token"], str)
    assert len(response_data["token"]) > 0

    async with async_session_maker() as session:
        project_user = await session.scalar(
            select(ProjectUser)
            .where(ProjectUser.project_id == project.id)
            .where(ProjectUser.firebase_uid == firebase_uid)
        )
        assert project_user is not None
        assert project_user.role == UserRoleEnum.MEMBER

        updated_invitation = await session.scalar(
            select(UserProjectInvitation).where(UserProjectInvitation.id == invitation.id)
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
        return_value={"uid": firebase_uid, "email": "test@example.com"},
    )

    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(UserProjectInvitation)
            .values(
                {
                    "project_id": project.id,
                    "email": "test@example.com",
                    "role": UserRoleEnum.MEMBER,
                    "invitation_sent_at": datetime.now(UTC),
                    "accepted_at": datetime.now(UTC),
                }
            )
            .returning(UserProjectInvitation)
        )
        await session.commit()

    response = await test_client.post(
        f"/projects/invitations/{invitation.id}/accept",
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
            insert(UserProjectInvitation)
            .values(
                {
                    "project_id": project.id,
                    "email": "test@example.com",
                    "role": UserRoleEnum.MEMBER,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(UserProjectInvitation)
        )
        await session.commit()

    response = await test_client.post(
        f"/projects/invitations/{invitation.id}/accept",
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
        return_value={"uid": "different_user_uid", "email": "test@example.com"},
    )

    async with async_session_maker() as session, session.begin():
        invitation = await session.scalar(
            insert(UserProjectInvitation)
            .values(
                {
                    "project_id": project.id,
                    "email": "test@example.com",
                    "role": UserRoleEnum.MEMBER,
                    "invitation_sent_at": datetime.now(UTC),
                }
            )
            .returning(UserProjectInvitation)
        )
        await session.commit()

    response = await test_client.post(
        f"/projects/invitations/{invitation.id}/accept",
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
            "email": "owner@example.com",
            "displayName": "Project Owner",
            "photoURL": "https://example.com/photo1.jpg",
        },
        "admin_uid": {
            "uid": "admin_uid",
            "email": "admin@example.com",
            "displayName": "Admin User",
            "photoURL": "https://example.com/photo2.jpg",
        },
        "member_uid": {
            "uid": "member_uid",
            "email": "member@example.com",
            "displayName": None,
            "photoURL": None,
        },
    }
    mocker.patch(
        "services.backend.src.api.routes.projects.get_users",
        return_value=firebase_users,
    )

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(ProjectUser).values(
                [
                    {
                        "project_id": project.id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.OWNER,
                    },
                    {
                        "project_id": project.id,
                        "firebase_uid": "admin_uid",
                        "role": UserRoleEnum.ADMIN,
                    },
                    {
                        "project_id": project.id,
                        "firebase_uid": "member_uid",
                        "role": UserRoleEnum.MEMBER,
                    },
                ]
            )
        )
        await session.commit()

    response = await test_client.get(
        f"/projects/{project.id}/members",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text
    members = response.json()
    assert len(members) == 3

    owner = next(m for m in members if m["firebase_uid"] == firebase_uid)
    assert owner["email"] == "owner@example.com"
    assert owner["display_name"] == "Project Owner"
    assert owner["photo_url"] == "https://example.com/photo1.jpg"
    assert owner["role"] == UserRoleEnum.OWNER.value

    admin = next(m for m in members if m["firebase_uid"] == "admin_uid")
    assert admin["email"] == "admin@example.com"
    assert admin["display_name"] == "Admin User"
    assert admin["role"] == UserRoleEnum.ADMIN.value

    member = next(m for m in members if m["firebase_uid"] == "member_uid")
    assert member["email"] == "member@example.com"
    assert member["display_name"] is None
    assert member["photo_url"] is None
    assert member["role"] == UserRoleEnum.MEMBER.value


async def test_list_project_members_no_access(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    other_project = ProjectFactory.build()
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(Project).values(
                id=other_project.id,
                name=other_project.name,
                description=other_project.description,
            )
        )

        await session.execute(
            insert(ProjectUser).values(
                project_id=other_project.id,
                firebase_uid="other_user_uid",
                role=UserRoleEnum.OWNER,
            )
        )
        await session.commit()

    response = await test_client.get(
        f"/projects/{other_project.id}/members",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_member_role_success(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.backend.src.api.routes.projects.get_users",
        return_value={
            "member_uid": {
                "uid": "member_uid",
                "email": "member@example.com",
                "displayName": "Member User",
                "photoURL": None,
            }
        },
    )

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(ProjectUser).values(
                [
                    {
                        "project_id": project.id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.OWNER,
                    },
                    {
                        "project_id": project.id,
                        "firebase_uid": "member_uid",
                        "role": UserRoleEnum.MEMBER,
                    },
                ]
            )
        )
        await session.commit()

    request_body = UpdateMemberRoleRequestBody(role=UserRoleEnum.ADMIN)
    response = await test_client.patch(
        f"/projects/{project.id}/members/member_uid",
        json=request_body,
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.OK, response.text
    member = response.json()
    assert member["firebase_uid"] == "member_uid"
    assert member["role"] == UserRoleEnum.ADMIN.value

    async with async_session_maker() as session:
        updated_member = await session.scalar(
            select(ProjectUser)
            .where(ProjectUser.project_id == project.id)
            .where(ProjectUser.firebase_uid == "member_uid")
        )
        assert updated_member.role == UserRoleEnum.ADMIN


async def test_update_member_role_cannot_modify_owner(
    test_client: TestingClientType,
    project: Project,
    firebase_uid: str,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(ProjectUser).values(
                [
                    {
                        "project_id": project.id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.OWNER,
                    },
                    {
                        "project_id": project.id,
                        "firebase_uid": "owner2_uid",
                        "role": UserRoleEnum.OWNER,
                    },
                ]
            )
        )
        await session.commit()

    request_body = UpdateMemberRoleRequestBody(role=UserRoleEnum.ADMIN)
    response = await test_client.patch(
        f"/projects/{project.id}/members/owner2_uid",
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
            insert(ProjectUser).values(
                [
                    {
                        "project_id": project.id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.ADMIN,
                    },
                    {
                        "project_id": project.id,
                        "firebase_uid": "member_uid",
                        "role": UserRoleEnum.MEMBER,
                    },
                ]
            )
        )
        await session.commit()

    request_body = UpdateMemberRoleRequestBody(role=UserRoleEnum.ADMIN)
    response = await test_client.patch(
        f"/projects/{project.id}/members/member_uid",
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
            insert(ProjectUser).values(
                project_id=project.id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.OWNER,
            )
        )
        await session.commit()

    request_body = UpdateMemberRoleRequestBody(role=UserRoleEnum.ADMIN)
    response = await test_client.patch(
        f"/projects/{project.id}/members/nonexistent_uid",
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
            insert(ProjectUser).values(
                [
                    {
                        "project_id": project.id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.OWNER,
                    },
                    {
                        "project_id": project.id,
                        "firebase_uid": "member_uid",
                        "role": UserRoleEnum.MEMBER,
                    },
                ]
            )
        )
        await session.commit()

    response = await test_client.delete(
        f"/projects/{project.id}/members/member_uid",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        removed_member = await session.scalar(
            select(ProjectUser)
            .where(ProjectUser.project_id == project.id)
            .where(ProjectUser.firebase_uid == "member_uid")
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
            insert(ProjectUser).values(
                [
                    {
                        "project_id": project.id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.OWNER,
                    },
                    {
                        "project_id": project.id,
                        "firebase_uid": "owner2_uid",
                        "role": UserRoleEnum.OWNER,
                    },
                ]
            )
        )
        await session.commit()

    response = await test_client.delete(
        f"/projects/{project.id}/members/owner2_uid",
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
            insert(ProjectUser).values(
                [
                    {
                        "project_id": project.id,
                        "firebase_uid": firebase_uid,
                        "role": UserRoleEnum.ADMIN,
                    },
                    {
                        "project_id": project.id,
                        "firebase_uid": "admin2_uid",
                        "role": UserRoleEnum.ADMIN,
                    },
                ]
            )
        )
        await session.commit()

    response = await test_client.delete(
        f"/projects/{project.id}/members/admin2_uid",
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
            insert(ProjectUser).values(
                project_id=project.id,
                firebase_uid=firebase_uid,
                role=UserRoleEnum.OWNER,
            )
        )
        await session.commit()

    response = await test_client.delete(
        f"/projects/{project.id}/members/nonexistent_uid",
        headers={"Authorization": "Bearer some_token"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "member not found" in response.json()["detail"].lower()
