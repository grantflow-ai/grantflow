from datetime import date
from http import HTTPStatus
from typing import Any
from unittest.mock import ANY, AsyncMock, patch
from uuid import UUID

from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantTemplate,
    GrantTemplateRagSource,
    Project,
    RagFile,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


async def test_update_grant_template_success(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    grant_template_id = None
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
        grant_template_id = grant_template.id

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
                "is_detailed_research_plan": False,
                "keywords": ["intro", "background"],
                "max_words": 500,
                "search_queries": ["introduction research"],
                "topics": ["research background"],
            }
        ],
        "submission_date": "2024-12-31",
    }

    response = await test_client.patch(
        f"/projects/{project.id}/applications/{grant_application.id}/grant-template/{grant_template_id}",
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
        assert section["is_detailed_research_plan"] is False
        assert section["keywords"] == ["intro", "background"]
        assert section["max_words"] == 500
        assert section["search_queries"] == ["introduction research"]
        assert section["topics"] == ["research background"]
        assert updated_template.submission_date == date(2024, 12, 31)


async def test_update_grant_template_not_found(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    project_member_user: None,
) -> None:
    non_existent_template_id = UUID("00000000-0000-0000-0000-000000000000")
    response = await test_client.patch(
        f"/projects/{project.id}/applications/{grant_application.id}/grant-template/{non_existent_template_id}",
        json={"submission_date": "2024-12-31"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "Grant template not found" in response.text


@patch(
    "services.backend.src.api.routes.grant_template.publish_rag_task",
    new_callable=AsyncMock,
)
async def test_generate_grant_template_success(
    mock_publish_rag_task: AsyncMock,
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    grant_template_id = None
    async with async_session_maker() as session, session.begin():
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

        grant_template = GrantTemplate(
            grant_application_id=grant_application.id,
            grant_sections=[],
        )
        session.add(grant_template)
        await session.flush()

        template_source = GrantTemplateRagSource(
            grant_template_id=grant_template.id,
            rag_source_id=rag_source.id,
        )
        session.add(template_source)
        await session.commit()
        grant_template_id = grant_template.id

    response = await test_client.post(
        f"/projects/{project.id}/applications/{grant_application.id}/grant-template/{grant_template_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    mock_publish_rag_task.assert_called_once_with(
        logger=ANY,
        parent_type="grant_template",
        parent_id=grant_template_id,
        trace_id=ANY,
    )


async def test_generate_grant_template_no_sources(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    grant_template_id = None
    async with async_session_maker() as session, session.begin():
        grant_template = GrantTemplate(
            grant_application_id=grant_application.id,
            grant_sections=[],
        )
        session.add(grant_template)
        await session.commit()
        grant_template_id = grant_template.id

    response = await test_client.post(
        f"/projects/{project.id}/applications/{grant_application.id}/grant-template/{grant_template_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "No rag sources found" in response.text


async def test_generate_grant_template_failed_sources_only(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    grant_template_id = None
    async with async_session_maker() as session, session.begin():
        rag_source = RagFile(
            bucket_name="test-bucket",
            object_path="test/path",
            filename="test.pdf",
            mime_type="application/pdf",
            size=1000,
            indexing_status=SourceIndexingStatusEnum.FAILED,
        )
        session.add(rag_source)
        await session.flush()

        grant_template = GrantTemplate(
            grant_application_id=grant_application.id,
            grant_sections=[],
        )
        session.add(grant_template)
        await session.flush()

        template_source = GrantTemplateRagSource(
            grant_template_id=grant_template.id,
            rag_source_id=rag_source.id,
        )
        session.add(template_source)
        await session.commit()
        grant_template_id = grant_template.id

    response = await test_client.post(
        f"/projects/{project.id}/applications/{grant_application.id}/grant-template/{grant_template_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST, response.text
    assert "No rag sources found" in response.text


async def test_update_grant_template_unauthorized(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    grant_template_id = None
    async with async_session_maker() as session, session.begin():
        grant_template = GrantTemplate(
            grant_application_id=grant_application.id,
            grant_sections=[],
        )
        session.add(grant_template)
        await session.commit()
        grant_template_id = grant_template.id

    different_project_id = UUID("00000000-0000-0000-0000-000000000000")
    response = await test_client.patch(
        f"/projects/{different_project_id}/applications/{grant_application.id}/grant-template/{grant_template_id}",
        json={"submission_date": "2024-12-31"},
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text
