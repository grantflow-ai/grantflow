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
    assert "applications" in data
    assert "pagination" in data
    assert len(data["applications"]) >= 3
    assert all("id" in app for app in data["applications"])
    assert all("title" in app for app in data["applications"])


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
    assert "applications" in data
    assert "pagination" in data
    assert data["applications"] == []


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
        json={"title": "Original Application (Copy)"},
    )

    assert response.status_code == HTTPStatus.CREATED
    data = response.json()

    assert data["title"] == "Original Application (Copy)"
    assert data["description"] == "Original description"
    assert data["status"] == ApplicationStatusEnum.IN_PROGRESS.value
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
        json={"title": "Copy of Non-existent"},
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
        from packages.db.src.enums import SourceIndexingStatusEnum
        from packages.shared_utils.src.url_utils import normalize_url

        rag_file = RagFile(
            bucket_name="test-bucket",
            object_path="gs://bucket/file.pdf",
            filename="file.pdf",
            mime_type="application/pdf",
            size=1024,
            source_type="rag_file",
            indexing_status=SourceIndexingStatusEnum.CREATED,
            parent_id=None,
        )
        session.add(rag_file)

        rag_url = RagUrl(
            url=normalize_url("https://example.com"),
            source_type="rag_url",
            indexing_status=SourceIndexingStatusEnum.CREATED,
            parent_id=None,
        )
        session.add(rag_url)

        await session.flush()

        app_file_link = GrantApplicationSource(
            grant_application_id=grant_application.id,
            rag_source_id=rag_file.id,
        )
        session.add(app_file_link)

        app_url_link = GrantApplicationSource(
            grant_application_id=grant_application.id,
            rag_source_id=rag_url.id,
        )
        session.add(app_url_link)

        template_file_link = GrantTemplateSource(
            grant_template_id=grant_template.id,
            rag_source_id=rag_file.id,
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

    file_sources = [s for s in data["rag_sources"] if "filename" in s]
    url_sources = [s for s in data["rag_sources"] if "url" in s]

    assert len(file_sources) == 1
    assert len(url_sources) == 1
    assert file_sources[0]["filename"] == "file.pdf"
    assert url_sources[0]["url"] == "https://example.com/"

    assert "grant_template" in data
    assert "rag_sources" in data["grant_template"]
    assert len(data["grant_template"]["rag_sources"]) == 1
    assert data["grant_template"]["rag_sources"][0]["filename"] == "file.pdf"


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


async def test_download_application_markdown(
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
            text="# Test Application\n\nThis is test content.",
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}/download?format=markdown",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["content-type"] == "text/markdown; charset=utf-8"
    assert response.headers["content-disposition"] == 'attachment; filename="Test Application.md"'
    assert "# Test Application" in response.text
    assert "This is test content." in response.text


async def test_download_application_pdf(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="PDF Test Application",
            description="Test description for PDF",
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
            text="# PDF Test Application\n\nThis is test content for PDF generation.",
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}/download?format=pdf",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == 'attachment; filename="PDF Test Application.pdf"'
    assert len(response.content) > 0
    assert response.content.startswith(b"%PDF")


async def test_download_application_docx(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="DOCX Test Application",
            description="Test description for DOCX",
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
            text="# DOCX Test Application\n\nThis is test content for DOCX generation.",
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}/download?format=docx",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    assert response.headers["content-disposition"] == 'attachment; filename="DOCX Test Application.docx"'
    assert len(response.content) > 0
    assert b"PK" in response.content[:10]


async def test_download_application_default_format(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="Default Format Test",
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
            text="# Default Format Test\n\nContent for default format test.",
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}/download",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    assert response.headers["content-type"] == "text/markdown; charset=utf-8"
    assert "Default Format Test.md" in response.headers["content-disposition"]


async def test_download_application_invalid_status(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="Invalid Status App",
            project_id=project.id,
            status=ApplicationStatusEnum.IN_PROGRESS,
            text="Some content",
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}/download",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "Application must be in WORKING_DRAFT status to download" in response.text


async def test_download_application_no_text_content(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="No Content App",
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
            text=None,
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}/download",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "Application has no content to download" in response.text


async def test_download_application_empty_text_content(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="Empty Content App",
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
            text="   ",
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}/download",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "Application has no content to download" in response.text


async def test_download_application_not_found(
    test_client: TestingClientType,
    project: Project,
    project_member_user: OrganizationUser,
) -> None:
    non_existent_id = uuid4()
    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{non_existent_id}/download",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


async def test_download_application_unauthorized(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="Unauthorized Test",
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
            text="Test content",
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}/download",
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_download_application_invalid_format(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="Invalid Format Test",
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
            text="Test content",
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}/download?format=invalid",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_download_application_filename_sanitization(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    unsafe_title = 'Test <App> "With" /Special: \\Characters|?*'

    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title=unsafe_title,
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
            text="Test content for filename sanitization",
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}/download",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    content_disposition = response.headers["content-disposition"]
    assert 'filename="Test_App_With_Special_Characters.md"' in content_disposition
    filename_part = content_disposition.split('filename="')[1].split('"')[0]
    assert all(char.isalnum() or char in "-_." for char in filename_part)


async def test_download_application_long_title_truncation(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    very_long_title = "A" * 300

    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title=very_long_title,
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
            text="Test content for long title",
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}/download",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    content_disposition = response.headers["content-disposition"]
    filename_part = content_disposition.split('filename="')[1].split('"')[0]
    assert len(filename_part) <= 255
    assert filename_part.endswith(".md")


async def test_download_application_empty_title_fallback(
    test_client: TestingClientType,
    project: Project,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        app = GrantApplication(
            title="",
            project_id=project.id,
            status=ApplicationStatusEnum.WORKING_DRAFT,
            text="Test content for empty title",
        )
        session.add(app)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/applications/{app.id}/download",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    content_disposition = response.headers["content-disposition"]
    assert 'filename="application.md"' in content_disposition
