from http import HTTPStatus
from typing import Any
from uuid import UUID

from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantTemplate,
    Project,
    ProjectUser,
)
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    GrantApplicationGenerationJobFactory,
    GrantTemplateGenerationJobFactory,
)

from services.backend.tests.conftest import TestingClientType


async def test_retrieve_grant_template_job_success(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: ProjectUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJobFactory.build(
            grant_template_id=grant_template.id,
            status=RagGenerationStatusEnum.PROCESSING,
            current_stage=2,
            total_stages=4,
            extracted_sections=[{"id": "section1", "title": "Introduction"}],
            extracted_metadata={"funder": "Test Foundation"},
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    response = await test_client.get(
        f"/projects/{project.id}/rag-jobs/{job_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert data["id"] == str(job_id)
    assert data["job_type"] == "grant_template_generation"
    assert data["status"] == "PROCESSING"
    assert data["current_stage"] == 2
    assert data["total_stages"] == 4
    assert data["retry_count"] == 0
    assert data["grant_template_id"] == str(grant_template.id)
    assert data["extracted_sections"] == [{"id": "section1", "title": "Introduction"}]
    assert data["extracted_metadata"] == {"funder": "Test Foundation"}
    assert "created_at" in data
    assert "updated_at" in data


async def test_retrieve_grant_application_job_success(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: ProjectUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = GrantApplicationGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            status=RagGenerationStatusEnum.COMPLETED,
            current_stage=5,
            total_stages=5,
            generated_sections={"introduction": "This is the introduction..."},
            validation_results={"is_valid": True, "score": 0.95},
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    response = await test_client.get(
        f"/projects/{project.id}/rag-jobs/{job_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert data["id"] == str(job_id)
    assert data["job_type"] == "grant_application_generation"
    assert data["status"] == "COMPLETED"
    assert data["current_stage"] == 5
    assert data["total_stages"] == 5
    assert data["grant_application_id"] == str(grant_application.id)
    assert data["generated_sections"] == {"introduction": "This is the introduction..."}
    assert data["validation_results"] == {"is_valid": True, "score": 0.95}


async def test_retrieve_job_with_error_details(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: ProjectUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJobFactory.build(
            grant_template_id=grant_template.id,
            status=RagGenerationStatusEnum.FAILED,
            error_message="Failed to extract sections",
            error_details={
                "error_type": "ExtractionError",
                "details": "Invalid PDF format",
            },
            retry_count=2,
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    response = await test_client.get(
        f"/projects/{project.id}/rag-jobs/{job_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert data["status"] == "FAILED"
    assert data["error_message"] == "Failed to extract sections"
    assert data["error_details"] == {
        "error_type": "ExtractionError",
        "details": "Invalid PDF format",
    }
    assert data["retry_count"] == 2


async def test_retrieve_job_not_found(
    test_client: TestingClientType,
    project: Project,
    project_member_user: ProjectUser,
) -> None:
    non_existent_id = UUID("00000000-0000-0000-0000-000000000000")

    response = await test_client.get(
        f"/projects/{project.id}/rag-jobs/{non_existent_id}",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text


async def test_retrieve_job_unauthorized(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJobFactory.build(grant_template_id=grant_template.id)
        session.add(job)
        await session.commit()
        job_id = job.id

    response = await test_client.get(f"/projects/{project.id}/rag-jobs/{job_id}")

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text
