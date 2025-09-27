from typing import Any
from uuid import uuid4

from packages.db.src.enums import ApplicationStatusEnum
from packages.db.src.tables import (
    EditorDocument,
    GrantApplication,
    GrantApplicationSource,
    GrantTemplate,
    GrantTemplateSource,
    OrganizationUser,
    Project,
    RagFile,
)
from pytest_mock import MockerFixture
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


async def test_duplicate_project_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project: Project,
    project_owner_user: OrganizationUser,
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.backend.src.api.routes.projects.get_users",
        return_value={
            project_owner_user.firebase_uid: {
                "uid": project_owner_user.firebase_uid,
                "email": f"test-{project_owner_user.firebase_uid}@example.com",
                "displayName": f"Test User {project_owner_user.firebase_uid}",
                "photoURL": f"https://example.com/photo-{project_owner_user.firebase_uid}.jpg",
            }
        },
    )

    async with async_session_maker() as session:
        app1 = GrantApplication(
            project_id=project.id,
            title="Application 1",
            description="Description 1",
            status=ApplicationStatusEnum.GENERATING,
            form_inputs={"field1": "value1"},
            research_objectives=[{"objective": "Test objective"}],
            text="Original text content",
        )
        app2 = GrantApplication(
            project_id=project.id,
            title="Application 2",
            status=ApplicationStatusEnum.IN_PROGRESS,
        )
        session.add_all([app1, app2])
        await session.flush()

        template1 = GrantTemplate(
            grant_application_id=app1.id,
            grant_sections=[{"title": "Section 1", "type": "section"}],
        )
        session.add(template1)

        editor_doc1 = EditorDocument(grant_application_id=app1.id)
        session.add(editor_doc1)

        await session.commit()
        app1_id = app1.id
        app2_id = app2.id

    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/duplicate",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()

    # Handle name truncation for very long project names
    expected_name = f"Copy of {project.name}"
    if len(expected_name) > 255:
        max_original_name_length = 255 - 8 - 3  # "Copy of " (8) + "..." (3)
        truncated_name = project.name[:max_original_name_length]
        expected_name = f"Copy of {truncated_name}..."

    assert data["name"] == expected_name
    assert data["description"] == project.description
    assert data["logo_url"] == project.logo_url
    assert data["id"] != str(project.id)
    assert len(data["grant_applications"]) == 2

    new_project_id = data["id"]

    async with async_session_maker() as session:
        new_project = await session.get(Project, new_project_id)
        assert new_project is not None
        assert new_project.name == f"Copy of {project.name}"

        new_apps = list(
            await session.scalars(
                select(GrantApplication)
                .where(GrantApplication.project_id == new_project_id)
                .where(GrantApplication.deleted_at.is_(None))
            )
        )
        assert len(new_apps) == 2

        for new_app in new_apps:
            if new_app.parent_id == app1_id:
                assert new_app.title == "Application 1"
                assert new_app.description == "Description 1"
                assert new_app.status == ApplicationStatusEnum.GENERATING
                assert new_app.form_inputs == {"field1": "value1"}
                assert new_app.research_objectives == [{"objective": "Test objective"}]
                assert new_app.text == "Original text content"

                template = await session.scalar(
                    select(GrantTemplate).where(GrantTemplate.grant_application_id == new_app.id)
                )
                assert template is not None
                assert template.grant_sections == [{"title": "Section 1", "type": "section"}]

                editor_doc = await session.scalar(
                    select(EditorDocument).where(EditorDocument.grant_application_id == new_app.id)
                )
                assert editor_doc is not None

            elif new_app.parent_id == app2_id:
                assert new_app.title == "Application 2"
                assert new_app.status == ApplicationStatusEnum.IN_PROGRESS


async def test_duplicate_project_with_custom_title(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project: Project,
    project_owner_user: OrganizationUser,
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.backend.src.api.routes.projects.get_users",
        return_value={
            project_owner_user.firebase_uid: {
                "uid": project_owner_user.firebase_uid,
                "email": f"test-{project_owner_user.firebase_uid}@example.com",
                "displayName": f"Test User {project_owner_user.firebase_uid}",
                "photoURL": f"https://example.com/photo-{project_owner_user.firebase_uid}.jpg",
            }
        },
    )

    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/duplicate",
        json={"title": "Custom Project Name"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Custom Project Name"


async def test_duplicate_project_preserves_rag_sources(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project: Project,
    project_owner_user: OrganizationUser,
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.backend.src.api.routes.projects.get_users",
        return_value={
            project_owner_user.firebase_uid: {
                "uid": project_owner_user.firebase_uid,
                "email": f"test-{project_owner_user.firebase_uid}@example.com",
                "displayName": f"Test User {project_owner_user.firebase_uid}",
                "photoURL": f"https://example.com/photo-{project_owner_user.firebase_uid}.jpg",
            }
        },
    )

    async with async_session_maker() as session:
        app = GrantApplication(
            project_id=project.id,
            title="App with RAG",
            status=ApplicationStatusEnum.WORKING_DRAFT,
        )
        session.add(app)
        await session.flush()

        rag_file = RagFile(
            bucket_name="test-bucket",
            object_path="test/path",
            filename="test.pdf",
            mime_type="application/pdf",
            size=1024,
        )
        session.add(rag_file)
        await session.flush()

        app_source = GrantApplicationSource(
            grant_application_id=app.id,
            rag_source_id=rag_file.id,
        )
        session.add(app_source)

        template = GrantTemplate(
            grant_application_id=app.id,
            grant_sections=[],
        )
        session.add(template)
        await session.flush()

        template_source = GrantTemplateSource(
            grant_template_id=template.id,
            rag_source_id=rag_file.id,
        )
        session.add(template_source)

        await session.commit()
        app_id = app.id
        rag_file_id = rag_file.id

    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/duplicate",
        json={"title": "Test Duplicate Project"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()
    new_project_id = data["id"]

    async with async_session_maker() as session:
        new_apps = list(
            await session.scalars(
                select(GrantApplication)
                .where(GrantApplication.project_id == new_project_id)
                .where(GrantApplication.deleted_at.is_(None))
            )
        )
        assert len(new_apps) == 1
        new_app = new_apps[0]
        assert new_app.parent_id == app_id

        app_sources = list(
            await session.scalars(
                select(GrantApplicationSource).where(GrantApplicationSource.grant_application_id == new_app.id)
            )
        )
        assert len(app_sources) == 1
        assert app_sources[0].rag_source_id == rag_file_id

        new_template = await session.scalar(
            select(GrantTemplate).where(GrantTemplate.grant_application_id == new_app.id)
        )
        assert new_template is not None

        template_sources = list(
            await session.scalars(
                select(GrantTemplateSource).where(GrantTemplateSource.grant_template_id == new_template.id)
            )
        )
        assert len(template_sources) == 1
        assert template_sources[0].rag_source_id == rag_file_id


async def test_duplicate_project_not_found(
    test_client: TestingClientType,
    project_owner_user: OrganizationUser,
) -> None:
    non_existent_id = uuid4()

    response = await test_client.post(
        f"/organizations/{project_owner_user.organization_id}/projects/{non_existent_id}/duplicate",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 404
    error_detail = response.json()["detail"]
    assert "not found" in error_detail.lower()


async def test_duplicate_project_wrong_organization(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project: Project,
    project_owner_user: OrganizationUser,
) -> None:
    other_org_id = uuid4()

    response = await test_client.post(
        f"/organizations/{other_org_id}/projects/{project.id}/duplicate",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 401
    error_detail = response.json()["detail"]
    assert "unauthorized" in error_detail.lower()


async def test_duplicate_project_excludes_deleted_applications(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project: Project,
    project_owner_user: OrganizationUser,
    mocker: MockerFixture,
) -> None:
    mocker.patch(
        "services.backend.src.api.routes.projects.get_users",
        return_value={
            project_owner_user.firebase_uid: {
                "uid": project_owner_user.firebase_uid,
                "email": f"test-{project_owner_user.firebase_uid}@example.com",
                "displayName": f"Test User {project_owner_user.firebase_uid}",
                "photoURL": f"https://example.com/photo-{project_owner_user.firebase_uid}.jpg",
            }
        },
    )

    async with async_session_maker() as session:
        app1 = GrantApplication(
            project_id=project.id,
            title="Active App",
            status=ApplicationStatusEnum.WORKING_DRAFT,
        )
        app2 = GrantApplication(
            project_id=project.id,
            title="Deleted App",
            status=ApplicationStatusEnum.WORKING_DRAFT,
        )
        session.add_all([app1, app2])
        await session.flush()

        app2.soft_delete()
        await session.commit()

    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/duplicate",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()
    assert len(data["grant_applications"]) == 1
    assert data["grant_applications"][0]["title"] == "Active App"


async def test_duplicate_project_unauthorized_role(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project: Project,
) -> None:
    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/duplicate",
        json={},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 401
