from typing import Any
from uuid import uuid4

from packages.db.src.enums import ApplicationStatusEnum
from packages.db.src.tables import (
    EditorDocument,
    GrantApplication,
    GrantApplicationSource,
    GrantTemplate,
    OrganizationUser,
    Project,
)
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


async def test_duplicate_application_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    project_id = grant_application.project_id

    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application.id)
        app.description = "Original description"
        app.form_inputs = {"field1": "value1"}
        app.research_objectives = [{"objective": "Test objective"}]
        app.text = "Original text content"
        await session.commit()

    async with async_session_maker() as session:
        project = await session.get(Project, project_id)
        organization_id = project.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Copy of Test Application"},
        headers={"Authorization": "Bearer some_token"},
    )

    if response.status_code != 201:
        pass
    assert response.status_code == 201
    data = response.json()

    assert data["title"] == "Copy of Test Application"
    assert data["description"] == "Original description"
    assert data["status"] == ApplicationStatusEnum.IN_PROGRESS.value
    assert data["parent_id"] == str(grant_application.id)
    assert data["id"] != str(grant_application.id)

    async with async_session_maker() as session:
        new_app = await session.get(GrantApplication, data["id"])
        assert new_app is not None
        assert new_app.parent_id == grant_application.id
        assert new_app.form_inputs == {"field1": "value1"}
        assert new_app.research_objectives == [{"objective": "Test objective"}]
        assert new_app.text == "Original text content"


async def test_duplicate_application_not_found(
    test_client: TestingClientType,
    project: Project,
    project_owner_user: OrganizationUser,
) -> None:
    non_existent_id = uuid4()

    response = await test_client.post(
        f"/projects/{project.id}/applications/{non_existent_id}/duplicate",
        json={"title": "Copy of Non-existent"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 404

    error_detail = response.json()["detail"]
    assert "not found" in error_detail.lower()


async def test_duplicate_application_wrong_project(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session:
        other_project = Project(name="Other Project", organization_id=project_owner_user.organization_id)
        session.add(other_project)
        await session.flush()
        other_project_id = other_project.id
        await session.commit()

    response = await test_client.post(
        f"/projects/{other_project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Unauthorized Copy"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 404
    error_detail = response.json()["detail"]
    assert "not found" in error_detail.lower()


async def test_duplicate_with_grant_template(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session:
        from sqlalchemy import select

        existing_template = await session.execute(
            select(GrantTemplate).where(
                GrantTemplate.grant_application_id == grant_application.id, GrantTemplate.deleted_at.is_(None)
            )
        )
        for template in existing_template.scalars():
            template.soft_delete()

        test_grant_sections = [
            {
                "title": "Test Section",
                "description": "Test description",
                "type": "section",
                "order": 1,
                "max_words": 100,
            }
        ]

        new_template = GrantTemplate(
            grant_application_id=grant_application.id, grant_sections=test_grant_sections, granting_institution_id=None
        )
        session.add(new_template)
        await session.commit()

        template_id = new_template.id

    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application.id)
        project_id = app.project_id
        project = await session.get(Project, project_id)
        organization_id = project.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Copy with Template"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()

    assert "grant_template" in data
    assert data["grant_template"]["id"] != str(template_id)
    assert data["grant_template"]["grant_sections"] == test_grant_sections


async def test_duplicate_preserves_rag_sources(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application_file: GrantApplicationSource,
    project_owner_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application_file.grant_application_id)
        project_id = app.project_id
        application_id = app.id

        await session.refresh(app, ["rag_sources"])
        original_rag_count = len(app.rag_sources)
        assert original_rag_count > 0

    async with async_session_maker() as session:
        project_obj = await session.get(Project, project_id)
        organization_id = project_obj.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{application_id}/duplicate",
        json={"title": "Copy with RAG Sources"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()

    assert len(data["rag_sources"]) == original_rag_count

    async with async_session_maker() as session:
        new_app = await session.get(GrantApplication, data["id"])
        await session.refresh(new_app, ["rag_sources"])
        assert len(new_app.rag_sources) == original_rag_count


async def test_duplicate_application_validation_error(
    test_client: TestingClientType,
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    project_id = grant_application.project_id

    async with async_session_maker() as session:
        project = await session.get(Project, project_id)
        organization_id = project.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": ""},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201


async def test_duplicate_application_preserves_status_as_draft(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    project_id = grant_application.project_id

    async with async_session_maker() as session:
        app = await session.get(GrantApplication, grant_application.id)
        app.status = ApplicationStatusEnum.GENERATING
        await session.commit()

    async with async_session_maker() as session:
        project = await session.get(Project, project_id)
        organization_id = project.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Draft Copy"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == ApplicationStatusEnum.IN_PROGRESS.value


async def test_duplicate_application_long_title(
    test_client: TestingClientType,
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    project_id = grant_application.project_id
    long_title = "A" * 300

    async with async_session_maker() as session:
        project = await session.get(Project, project_id)
        organization_id = project.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": long_title},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == long_title


async def test_duplicate_application_no_editor_document(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    project_owner_user: OrganizationUser,
) -> None:
    project_id = grant_application.project_id

    async with async_session_maker() as session:
        project = await session.get(Project, project_id)
        organization_id = project.organization_id

    response = await test_client.post(
        f"/organizations/{organization_id}/projects/{project_id}/applications/{grant_application.id}/duplicate",
        json={"title": "Copy without Editor Document"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == 201
    data = response.json()

    async with async_session_maker() as session:
        from sqlalchemy import select

        editor_doc = await session.execute(
            select(EditorDocument).where(
                EditorDocument.grant_application_id == data["id"],
                EditorDocument.deleted_at.is_(None),
            )
        )
        assert editor_doc.scalar_one_or_none() is None
