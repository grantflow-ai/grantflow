from datetime import date
from http import HTTPStatus
from typing import Any
from uuid import UUID

from packages.db.src.enums import ApplicationStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantTemplate,
    Workspace,
)
from services.backend.tests.conftest import TestingClientType
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker


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


async def test_update_grant_template_success(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    workspace_member_user: None,
) -> None:
    async with async_session_maker() as session, session.begin():
        grant_template = GrantTemplate(
            grant_application_id=grant_application.id,
            grant_sections=[
                {
                    "id": "existing_section",
                    "order": 1,
                    "title": "Existing Section",
                    "parent_id": None,
                }
            ],
        )
        session.add(grant_template)
        await session.commit()

    update_data = {
        "grant_sections": [
            {
                "id": "section1",
                "order": 1,
                "title": "Introduction",
                "parent_id": None,
                "depends_on": [],
                "generation_instructions": "Write an introduction",
                "is_clinical_trial": False,
                "is_detailed_workplan": False,
                "keywords": ["intro", "background"],
                "max_words": 500,
                "search_queries": ["introduction research"],
                "topics": ["research background"],
            }
        ],
        "submission_date": "2024-12-31",
    }

    response = await test_client.patch(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/grant-template",
        json=update_data,
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text

    async with async_session_maker() as session:
        updated_template = await session.scalar(
            select(GrantTemplate).where(GrantTemplate.grant_application_id == grant_application.id)
        )
        assert updated_template is not None
        assert len(updated_template.grant_sections) == 1
        section = updated_template.grant_sections[0]
        assert section["title"] == "Introduction"
        assert section["id"] == "section1"
        assert section["order"] == 1
        assert section["depends_on"] == []
        assert section["generation_instructions"] == "Write an introduction"
        assert section["is_clinical_trial"] is False
        assert section["is_detailed_workplan"] is False
        assert section["keywords"] == ["intro", "background"]
        assert section["max_words"] == 500
        assert section["search_queries"] == ["introduction research"]
        assert section["topics"] == ["research background"]
        assert updated_template.submission_date == date(2024, 12, 31)


async def test_update_grant_template_not_found(
    test_client: TestingClientType,
    workspace: Workspace,
    grant_application: GrantApplication,
    workspace_member_user: None,
) -> None:
    response = await test_client.patch(
        f"/workspaces/{workspace.id}/applications/{grant_application.id}/grant-template",
        json={"submission_date": "2024-12-31"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "Grant template not found" in response.text


async def test_update_grant_template_application_not_found(
    test_client: TestingClientType,
    workspace: Workspace,
    workspace_member_user: None,
) -> None:
    non_existent_id = UUID("00000000-0000-0000-0000-000000000000")

    response = await test_client.patch(
        f"/workspaces/{workspace.id}/applications/{non_existent_id}/grant-template",
        json={"submission_date": "2024-12-31"},
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
