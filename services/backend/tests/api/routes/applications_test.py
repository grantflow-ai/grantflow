from http import HTTPStatus
from typing import Any
from unittest.mock import ANY, AsyncMock, patch
from uuid import UUID

from packages.db.src.enums import ApplicationStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantTemplate,
    Workspace,
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
