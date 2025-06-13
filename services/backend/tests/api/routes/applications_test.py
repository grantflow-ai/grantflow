from datetime import UTC, date, datetime
from http import HTTPStatus
from typing import Any
from unittest.mock import ANY, AsyncMock, patch
from uuid import UUID

from packages.db.src.enums import ApplicationStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantTemplate,
    Workspace,
    WorkspaceUser,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


async def test_create_application_success(
    test_client: TestingClientType,
    workspace: Workspace,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: None,
) -> None:
    response = await test_client.post(
        f"/workspaces/{workspace.id}/applications",
        json={"title": "Test Grant Application"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    data = response.json()
    assert "id" in data

    async with async_session_maker() as session:
        application = await session.scalar(select(GrantApplication).where(GrantApplication.id == UUID(data["id"])))
        assert application is not None
        assert application.title == "Test Grant Application"
        assert application.workspace_id == workspace.id
        assert application.status == ApplicationStatusEnum.DRAFT


async def test_create_application_unauthorized(
    test_client: TestingClientType,
) -> None:
    different_workspace_id = UUID("00000000-0000-0000-0000-000000000000")

    response = await test_client.post(
        f"/workspaces/{different_workspace_id}/applications",
        json={"title": "Test Grant Application"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


async def test_update_application_success(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: None,
) -> None:
    update_data = {
        "title": "Updated Title",
        "status": ApplicationStatusEnum.IN_PROGRESS.value,
        "form_inputs": {"field1": "value1", "field2": "value2"},
        "research_objectives": [
            {
                "number": 1,
                "title": "Objective 1",
                "description": "Description 1",
                "research_tasks": [
                    {
                        "number": 1,
                        "title": "Task 1",
                        "description": "Task Description 1",
                    }
                ],
            }
        ],
    }

    response = await test_client.patch(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        json=update_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text

    async with async_session_maker() as session:
        updated_app = await session.scalar(select(GrantApplication).where(GrantApplication.id == grant_application.id))
        assert updated_app is not None
        assert updated_app.title == "Updated Title"
        assert updated_app.status == ApplicationStatusEnum.IN_PROGRESS
        assert updated_app.form_inputs == {"field1": "value1", "field2": "value2"}
        assert len(updated_app.research_objectives) == 1
        assert updated_app.research_objectives[0]["title"] == "Objective 1"


async def test_update_application_not_found(
    test_client: TestingClientType,
    workspace: Workspace,
    workspace_member_user: None,
) -> None:
    non_existent_id = UUID("00000000-0000-0000-0000-000000000000")

    response = await test_client.patch(
        f"/workspaces/{workspace.id}/applications/{non_existent_id}",
        json={"title": "Updated Title"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "Application not found" in response.text


async def test_delete_application_success(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: None,
) -> None:
    response = await test_client.delete(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT, response.text

    async with async_session_maker() as session:
        result = await session.scalar(select(GrantApplication).where(GrantApplication.id == grant_application.id))
        assert result is None


async def test_delete_application_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    different_workspace_id = UUID("00000000-0000-0000-0000-000000000000")

    response = await test_client.delete(
        f"/workspaces/{different_workspace_id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


@patch("services.backend.src.api.routes.grant_applications.publish_rag_task", new_callable=AsyncMock)
async def test_generate_application_success(
    mock_publish_rag_task: AsyncMock,
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: None,
) -> None:
    # Set up the application with required data
    async with async_session_maker() as session, session.begin():
        from packages.db.src.enums import SourceIndexingStatusEnum
        from packages.db.src.tables import GrantApplicationRagSource, RagFile

        # Update application with research objectives
        grant_application.research_objectives = [
            {
                "number": 1,
                "title": "Research Objective 1",
                "description": "Description of objective 1",
                "research_tasks": [
                    {
                        "number": 1,
                        "title": "Research Task 1",
                        "description": "Task description",
                    }
                ],
            }
        ]
        session.add(grant_application)

        # Create grant template with sections
        grant_template = GrantTemplate(
            grant_application_id=grant_application.id,
            grant_sections=[
                {
                    "id": "section1",
                    "order": 1,
                    "title": "Introduction",
                    "parent_id": None,
                }
            ],
        )
        session.add(grant_template)

        # Create a rag source with FINISHED status
        rag_source = RagFile(
            bucket_name="test-bucket",
            object_path="test/path",
            filename="test.pdf",
            mime_type="application/pdf",
            size=1000,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )
        session.add(rag_source)
        await session.flush()

        # Link rag source to grant application
        app_source = GrantApplicationRagSource(
            grant_application_id=grant_application.id,
            rag_source_id=rag_source.id,
        )
        session.add(app_source)
        await session.commit()

    response = await test_client.post(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    mock_publish_rag_task.assert_called_once_with(
        logger=ANY, parent_type="grant_application", parent_id=grant_application.id
    )


async def test_generate_application_insufficient_data(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    workspace_member_user: None,
) -> None:
    # Application without required data (no research objectives or grant template)
    response = await test_client.post(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "Insufficient data" in response.text


async def test_generate_application_no_rag_sources(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: None,
) -> None:
    # Set up the application with all required data except rag sources
    async with async_session_maker() as session, session.begin():
        # Update application with research objectives
        grant_application.research_objectives = [
            {
                "number": 1,
                "title": "Research Objective 1",
                "description": "Description of objective 1",
                "research_tasks": [
                    {
                        "number": 1,
                        "title": "Research Task 1",
                        "description": "Task description",
                    }
                ],
            }
        ]
        session.add(grant_application)

        # Create grant template with sections
        grant_template = GrantTemplate(
            grant_application_id=grant_application.id,
            grant_sections=[
                {
                    "id": "section1",
                    "order": 1,
                    "title": "Introduction",
                    "parent_id": None,
                }
            ],
        )
        session.add(grant_template)
        # Note: No rag sources created
        await session.commit()

    response = await test_client.post(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "No rag sources found" in response.text


async def test_generate_application_not_found(
    test_client: TestingClientType,
    workspace: Workspace,
    workspace_member_user: None,
) -> None:
    non_existent_id = UUID("00000000-0000-0000-0000-000000000000")

    response = await test_client.post(
        f"/workspaces/{workspace.id}/applications/{non_existent_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text


# Retrieve Application Tests


async def test_retrieve_application_success(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    workspace_member_user: None,
) -> None:
    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    # Verify basic application fields
    assert data["id"] == str(grant_application.id)
    assert data["workspace_id"] == str(grant_application.workspace_id)
    assert data["title"] == grant_application.title
    assert data["status"] == grant_application.status.value
    assert "created_at" in data
    assert "updated_at" in data
    assert data["rag_sources"] == []


async def test_retrieve_application_with_grant_template(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    workspace_member_user: None,
) -> None:
    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    # Verify application data
    assert data["id"] == str(grant_application.id)
    assert data["title"] == grant_application.title

    # Verify grant_template exists and has correct structure
    assert "grant_template" in data
    template_data = data["grant_template"]
    assert template_data["id"] == str(grant_template.id)
    assert "grant_sections" in template_data
    assert "funding_organization_id" in template_data
    assert "rag_sources" in template_data
    assert template_data["rag_sources"] == []  # No template sources initially

    # Verify funding organization data is included if present
    if "funding_organization" in template_data:
        org_data = template_data["funding_organization"]
        assert "id" in org_data
        assert "full_name" in org_data

    # Basic test should have no RAG sources initially
    assert data["rag_sources"] == []


async def test_retrieve_application_not_found(
    test_client: TestingClientType,
    workspace: Workspace,
    workspace_member_user: None,
) -> None:
    non_existent_id = UUID("00000000-0000-0000-0000-000000000000")

    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{non_existent_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text


async def test_retrieve_application_wrong_workspace(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: None,
) -> None:
    # Create a different workspace with a workspace user for authorization
    async with async_session_maker() as session, session.begin():
        different_workspace = Workspace(name="Different Workspace")
        session.add(different_workspace)
        await session.flush()

        # Create workspace user for the different workspace for authorization
        from packages.db.src.enums import UserRoleEnum

        firebase_uid = "a" * 128  # Same as test fixture
        workspace_user = WorkspaceUser(
            workspace_id=different_workspace.id, firebase_uid=firebase_uid, role=UserRoleEnum.MEMBER
        )
        session.add(workspace_user)
        await session.commit()

    response = await test_client.get(
        f"/workspaces/{different_workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text


async def test_retrieve_application_unauthorized(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
) -> None:
    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        # No authorization header
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


async def test_retrieve_application_with_complete_data(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: None,
) -> None:
    from packages.db.src.tables import FundingOrganization

    async with async_session_maker() as session, session.begin():
        # Re-attach grant_application and grant_template to the session
        app = await session.get(GrantApplication, grant_application.id)
        template = await session.get(GrantTemplate, grant_template.id)

        # Add funding organization to template
        funding_org = FundingOrganization(
            full_name="Test Funding Organization Complete",
            abbreviation="TFOC",
        )
        session.add(funding_org)
        await session.flush()

        template.funding_organization_id = funding_org.id
        template.submission_date = date(2024, 12, 31)

        # Update application with additional fields
        app.form_inputs = {"principal_investigator": "Dr. Smith", "budget": "500000"}
        app.research_objectives = [
            {
                "number": 1,
                "title": "Objective 1",
                "description": "Research objective description",
                "research_tasks": [{"number": 1, "title": "Task 1", "description": "Task description"}],
            }
        ]
        app.text = "Generated application text content"
        app.completed_at = datetime.now(tz=UTC)

        await session.commit()

    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    # Verify basic fields
    assert data["id"] == str(grant_application.id)
    assert data["workspace_id"] == str(grant_application.workspace_id)
    assert data["title"] == grant_application.title
    assert data["status"] == grant_application.status.value
    assert data["form_inputs"] == {"principal_investigator": "Dr. Smith", "budget": "500000"}
    assert data["text"] == "Generated application text content"
    assert len(data["research_objectives"]) == 1
    assert data["research_objectives"][0]["title"] == "Objective 1"
    assert "completed_at" in data

    # Verify grant template with funding organization
    assert "grant_template" in data
    template_data = data["grant_template"]
    assert template_data["id"] == str(grant_template.id)
    assert template_data["submission_date"] == "2024-12-31"
    assert "funding_organization" in template_data
    org_data = template_data["funding_organization"]
    assert org_data["full_name"] == "Test Funding Organization Complete"
    assert org_data["abbreviation"] == "TFOC"

    # Verify template rag_sources field exists
    assert "rag_sources" in template_data
    assert template_data["rag_sources"] == []  # No template sources initially

    # No application RAG sources in this test
    assert data["rag_sources"] == []


async def test_retrieve_application_with_rag_sources(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: None,
) -> None:
    from packages.db.src.enums import SourceIndexingStatusEnum
    from packages.db.src.tables import (
        GrantApplicationRagSource,
        GrantTemplateRagSource,
        RagFile,
        RagUrl,
    )

    async with async_session_maker() as session, session.begin():
        # Re-attach entities to the session
        app = await session.get(GrantApplication, grant_application.id)
        template = await session.get(GrantTemplate, grant_template.id)

        # Create RagFile source
        rag_file = RagFile(
            bucket_name="test-bucket",
            object_path="test/path/document.pdf",
            filename="research_proposal.pdf",
            mime_type="application/pdf",
            size=2048576,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )
        session.add(rag_file)
        await session.flush()

        # Create RagUrl source
        rag_url = RagUrl(
            url="https://example.com/grant-guidelines",
            title="Grant Guidelines",
            indexing_status=SourceIndexingStatusEnum.INDEXING,
        )
        session.add(rag_url)
        await session.flush()

        # Create another RagFile for template
        template_rag_file = RagFile(
            bucket_name="test-bucket",
            object_path="test/path/template_doc.docx",
            filename="grant_template_guide.docx",
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size=1024000,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )
        session.add(template_rag_file)
        await session.flush()

        # Link sources to application
        app_rag_file = GrantApplicationRagSource(
            grant_application_id=app.id,
            rag_source_id=rag_file.id,
        )
        app_rag_url = GrantApplicationRagSource(
            grant_application_id=app.id,
            rag_source_id=rag_url.id,
        )
        session.add(app_rag_file)
        session.add(app_rag_url)

        # Link source to template
        template_rag_source = GrantTemplateRagSource(
            grant_template_id=template.id,
            rag_source_id=template_rag_file.id,
        )
        session.add(template_rag_source)

        await session.commit()

    response = await test_client.get(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    # Verify basic fields
    assert data["id"] == str(grant_application.id)

    # Verify application RAG sources using standardized format
    assert len(data["rag_sources"]) == 2

    # Find specific sources
    app_sources = data["rag_sources"]
    file_source = next((s for s in app_sources if "filename" in s), None)
    url_source = next((s for s in app_sources if "url" in s), None)

    # Verify file source
    assert file_source is not None
    assert file_source["sourceId"] == str(rag_file.id)
    assert file_source["filename"] == "research_proposal.pdf"
    assert file_source["status"] == "finished"
    assert "url" not in file_source

    # Verify URL source
    assert url_source is not None
    assert url_source["sourceId"] == str(rag_url.id)
    assert url_source["url"] == "https://example.com/grant-guidelines"
    assert url_source["status"] == "indexing"
    assert "filename" not in url_source

    # Verify template with rag sources
    assert "grant_template" in data
    template_data = data["grant_template"]
    assert "rag_sources" in template_data
    assert len(template_data["rag_sources"]) == 1

    # Verify template source
    template_source = template_data["rag_sources"][0]
    assert template_source["sourceId"] == str(template_rag_file.id)
    assert template_source["filename"] == "grant_template_guide.docx"
    assert template_source["status"] == "finished"
    assert "url" not in template_source
