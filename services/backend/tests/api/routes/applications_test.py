from http import HTTPStatus
from typing import Any
from uuid import uuid4

import pytest
from packages.db.src.enums import ApplicationStatusEnum
from packages.db.src.json_objects import ResearchObjective
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationSource,
    GrantTemplate,
    GrantTemplateSource,
    OrganizationUser,
    Project,
    RagFile,
    RagSource,
    RagUrl,
)
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


@pytest.fixture
def project_member_user(project_owner_user: OrganizationUser) -> OrganizationUser:
    return project_owner_user


async def test_list_applications(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        for i in range(3):
            app = GrantApplication(
                title=f"Application {i}",
                project_id=project.id,
                status=ApplicationStatusEnum.WORKING_DRAFT,
            )
            session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert len(data) >= 3
    assert all("id" in app for app in data)
    assert all("title" in app for app in data)


async def test_list_applications_empty(
    test_client: TestingClientType,
    project: Project,
    project_member_user: OrganizationUser,
) -> None:
    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data == []


async def test_list_applications_unauthorized(
    test_client: TestingClientType,
    project: Project,
) -> None:
    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications",
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_create_application(
    test_client: TestingClientType,
    project: Project,
    project_member_user: OrganizationUser,
) -> None:
    application_data = {
        "title": "New Application",
        "description": "Test description",
    }

    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications",
        json=application_data,
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.CREATED
    data = response.json()
    assert data["title"] == "New Application"
    assert data["description"] == "Test description"
    assert "id" in data
    assert data["status"] == ApplicationStatusEnum.WORKING_DRAFT.value


async def test_create_application_minimal(
    test_client: TestingClientType,
    project: Project,
    project_member_user: OrganizationUser,
) -> None:
    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications",
        json={"title": "Minimal Application"},
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.CREATED
    data = response.json()
    assert data["title"] == "Minimal Application"
    assert data["status"] == ApplicationStatusEnum.WORKING_DRAFT.value


async def test_retrieve_application(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="Test Application",
            description="Test description",
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["id"] == str(app.id)
    assert data["title"] == "Test Application"
    assert data["description"] == "Test description"


async def test_retrieve_application_not_found(
    test_client: TestingClientType,
    project: Project,
    project_member_user: OrganizationUser,
) -> None:
    non_existent_id = uuid4()
    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{non_existent_id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


async def test_update_application(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="Original Title",
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
        )
        session.add(app)
        await session.commit()

    update_data = {
        "title": "Updated Title",
        "description": "Updated description",
        "status": ApplicationStatusEnum.IN_PROGRESS.value,
    }

    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["description"] == "Updated description"
    assert data["status"] == ApplicationStatusEnum.IN_PROGRESS.value


async def test_update_application_partial(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="Original Title",
            description="Original description",
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
        )
        session.add(app)
        await session.commit()

    response = await test_client.patch(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}",
        json={"title": "Only Title Updated"},
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["title"] == "Only Title Updated"
    assert data["description"] == "Original description"


async def test_delete_application(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="To Delete",
            project_id=project.id,
        )
        session.add(app)
        await session.commit()

    response = await test_client.delete(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        deleted_app = await session.get(GrantApplication, app.id)
        assert deleted_app is not None
        assert deleted_app.deleted_at is not None


async def test_retrieve_application_with_grant_template(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="App with Template",
            project_id=project.id,
        )
        session.add(app)
        await session.flush()

        template = GrantTemplate(
            grant_application_id=app.id,
            grant_sections=[
                {"id": "section1", "title": "Introduction", "order": 1},
                {"id": "section2", "title": "Methods", "order": 2},
            ],
        )
        session.add(template)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert "grant_template" in data
    assert data["grant_template"]["id"] == str(template.id)
    assert len(data["grant_template"]["grant_sections"]) == 2


async def test_retrieve_application_with_research_objectives(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    research_objectives: list[ResearchObjective] = [
        ResearchObjective(
            number=1,
            title="Objective 1",
            description="Description 1",
            research_tasks=[],
        ),
        ResearchObjective(
            number=2,
            title="Objective 2",
            description="Description 2",
            research_tasks=[],
        ),
    ]

    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="App with Objectives",
            project_id=project.id,
            research_objectives=research_objectives,
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert "research_objectives" in data
    assert len(data["research_objectives"]) == 2
    assert data["research_objectives"][0]["title"] == "Objective 1"


async def test_duplicate_application(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        original_app = GrantApplication(
            title="Original Application",
            description="Original description",
            project_id=project.id,
            status=ApplicationStatusEnum.IN_PROGRESS,
            text="Some text content",
            research_objectives=[
                ResearchObjective(
                    number=1,
                    title="Test Objective",
                    description="Test description",
                    research_tasks=[],
                )
            ],
        )
        session.add(original_app)
        await session.flush()

        template = GrantTemplate(
            grant_application_id=original_app.id,
            grant_sections=[{"id": "s1", "title": "Section 1", "order": 1}],
        )
        session.add(template)
        await session.commit()

    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{original_app.id}/duplicate",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.CREATED
    data = response.json()

    assert data["title"] == "Original Application (Copy)"
    assert data["description"] == "Original description"
    assert data["status"] == ApplicationStatusEnum.WORKING_DRAFT.value
    assert data["text"] == "Some text content"
    assert len(data["research_objectives"]) == 1
    assert data["research_objectives"][0]["title"] == "Test Objective"

    assert "grant_template" in data
    assert len(data["grant_template"]["grant_sections"]) == 1


async def test_duplicate_application_not_found(
    test_client: TestingClientType,
    project: Project,
    project_member_user: OrganizationUser,
) -> None:
    non_existent_id = uuid4()
    response = await test_client.post(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{non_existent_id}/duplicate",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


async def test_retrieve_application_with_rag_sources(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        # Create RagSource for file first
        from packages.db.src.enums import SourceIndexingStatusEnum

        file_source = RagSource(
            source_type="rag_file",
            indexing_status=SourceIndexingStatusEnum.CREATED,
        )
        session.add(file_source)
        await session.flush()

        # Create RagFile with proper fields
        rag_file = RagFile(
            id=file_source.id,
            bucket_name="test-bucket",
            object_path="gs://bucket/file.pdf",
            filename="file.pdf",
            mime_type="application/pdf",
            size=1024,
        )
        session.add(rag_file)

        # Create RagSource for URL
        url_source = RagSource(
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.CREATED,
        )
        session.add(url_source)
        await session.flush()

        # Create RagUrl with proper fields
        rag_url = RagUrl(
            id=url_source.id,
            url="https://example.com",
        )
        session.add(rag_url)

        await session.flush()

        app_file_link = GrantApplicationSource(
            grant_application_id=grant_application.id,
            rag_source_id=file_source.id,
        )
        session.add(app_file_link)

        app_url_link = GrantApplicationSource(
            grant_application_id=grant_application.id,
            rag_source_id=url_source.id,
        )
        session.add(app_url_link)

        template_file_link = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=file_source.id,
        )
        session.add(template_file_link)

        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert "rag_sources" in data
    assert len(data["rag_sources"]) == 2
    source_identifiers = {s["identifier"] for s in data["rag_sources"]}
    assert "file.pdf" in source_identifiers
    assert "https://example.com" in source_identifiers

    assert "grant_template" in data
    assert "rag_sources" in data["grant_template"]
    assert len(data["grant_template"]["rag_sources"]) == 1
    assert data["grant_template"]["rag_sources"][0]["identifier"] == "file.pdf"


@pytest.fixture
async def grant_application(
    async_session_maker: async_sessionmaker[Any],
    project: Project,
) -> GrantApplication:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="Test Grant Application",
            project_id=project.id,
        )
        session.add(app)
        await session.commit()
    return app


@pytest.fixture
async def grant_template(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> GrantTemplate:
    async with async_session_maker() as session, session.begin():
        template = GrantTemplate(
            grant_application_id=grant_application.id,
            grant_sections=[],
        )
        session.add(template)
        await session.commit()
    return template
