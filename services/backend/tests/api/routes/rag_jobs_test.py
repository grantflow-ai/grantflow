from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any
from uuid import UUID, uuid4

import pytest
from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantTemplate,
    Organization,
    OrganizationUser,
    Project,
)
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    GrantApplicationGenerationJobFactory,
    GrantTemplateGenerationJobFactory,
    ProjectFactory,
)

from services.backend.tests.conftest import TestingClientType


@pytest.fixture
def project_member_user(project_owner_user: OrganizationUser) -> OrganizationUser:
    return project_owner_user


@pytest.fixture
def otp_code(firebase_uid: str) -> str:
    from services.backend.src.utils.jwt import create_jwt
    return create_jwt(firebase_uid)


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


async def test_retrieve_grant_template_job_success(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
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
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{job_id}",
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
    project_member_user: OrganizationUser,
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
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{job_id}",
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
    project_member_user: OrganizationUser,
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
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{job_id}",
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
    project_member_user: OrganizationUser,
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

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{job_id}"
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED, response.text


async def test_retrieve_job_not_found_in_database(
    test_client: TestingClientType,
    project: Project,
    project_member_user: OrganizationUser,
    otp_code: str,
) -> None:
    non_existent_id = uuid4()

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{non_existent_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text
    assert "RAG job not found" in response.json()["detail"]


async def test_retrieve_template_job_wrong_project(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    organization: Organization,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
    otp_code: str,
) -> None:
    
    async with async_session_maker() as session, session.begin():
        other_project = ProjectFactory.build(organization_id=organization.id)
        session.add(other_project)
        await session.flush()

        other_application = GrantApplication(
            title="Other App",
            project_id=other_project.id,
        )
        session.add(other_application)
        await session.flush()

        other_template = GrantTemplate(
            grant_application_id=other_application.id,
            grant_sections=[],
        )
        session.add(other_template)
        await session.flush()

        job = GrantTemplateGenerationJobFactory.build(
            grant_template_id=other_template.id,
            status=RagGenerationStatusEnum.PROCESSING,
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    
    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{job_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text
    assert "RAG job not found" in response.json()["detail"]


async def test_retrieve_application_job_wrong_project(
    test_client: TestingClientType,
    project: Project,
    organization: Organization,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
    otp_code: str,
) -> None:
    
    async with async_session_maker() as session, session.begin():
        other_project = ProjectFactory.build(organization_id=organization.id)
        session.add(other_project)
        await session.flush()

        other_application = GrantApplication(
            title="Other App",
            project_id=other_project.id,
        )
        session.add(other_application)
        await session.flush()

        job = GrantApplicationGenerationJobFactory.build(
            grant_application_id=other_application.id,
            status=RagGenerationStatusEnum.PROCESSING,
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    
    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{job_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text
    assert "RAG job not found" in response.json()["detail"]


async def test_retrieve_job_with_all_timestamps(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
    otp_code: str,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJobFactory.build(
            grant_template_id=grant_template.id,
            status=RagGenerationStatusEnum.COMPLETED,
            started_at=datetime(2024, 1, 1, 10, 0, tzinfo=UTC),
            completed_at=datetime(2024, 1, 1, 10, 30, tzinfo=UTC),
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{job_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert "started_at" in data
    assert "completed_at" in data
    assert "2024-01-01T10:00:00" in data["started_at"]
    assert "2024-01-01T10:30:00" in data["completed_at"]


async def test_retrieve_job_with_failed_timestamp(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
    otp_code: str,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = GrantApplicationGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            status=RagGenerationStatusEnum.FAILED,
            started_at=datetime(2024, 1, 1, 10, 0, tzinfo=UTC),
            failed_at=datetime(2024, 1, 1, 10, 5, tzinfo=UTC),
            completed_at=None,
            error_message="Connection timeout",
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{job_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert "started_at" in data
    assert "failed_at" in data
    assert "completed_at" not in data
    assert data["error_message"] == "Connection timeout"


async def test_retrieve_template_job_minimal_data(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
    otp_code: str,
) -> None:
    
    async with async_session_maker() as session, session.begin():
        job = GrantTemplateGenerationJobFactory.build(
            grant_template_id=grant_template.id,
            status=RagGenerationStatusEnum.PENDING,
            extracted_sections=None,
            extracted_metadata=None,
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{job_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert data["grant_template_id"] == str(grant_template.id)
    assert "extracted_sections" not in data
    assert "extracted_metadata" not in data


async def test_retrieve_application_job_minimal_data(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
    otp_code: str,
) -> None:
    
    async with async_session_maker() as session, session.begin():
        job = GrantApplicationGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            status=RagGenerationStatusEnum.PENDING,
            generated_sections=None,
            validation_results=None,
        )
        session.add(job)
        await session.commit()
        job_id = job.id

    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{job_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.OK, response.text
    data = response.json()

    assert data["grant_application_id"] == str(grant_application.id)
    assert "generated_sections" not in data
    assert "validation_results" not in data


async def test_retrieve_template_job_no_subclass(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
    otp_code: str,
) -> None:
    
    async with async_session_maker() as session, session.begin():
        
        template_job = GrantTemplateGenerationJobFactory.build(
            grant_template_id=grant_template.id,
            status=RagGenerationStatusEnum.PROCESSING,
        )
        session.add(template_job)
        await session.flush()
        job_id = template_job.id

        
        from sqlalchemy import text
        await session.execute(
            text(f"DELETE FROM grant_template_generation_jobs WHERE id = '{job_id}'")
        )
        await session.commit()

    
    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{job_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text


async def test_retrieve_application_job_no_subclass(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
    otp_code: str,
) -> None:
    
    async with async_session_maker() as session, session.begin():
        
        app_job = GrantApplicationGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            status=RagGenerationStatusEnum.PROCESSING,
        )
        session.add(app_job)
        await session.flush()
        job_id = app_job.id

        
        from sqlalchemy import text
        await session.execute(
            text(f"DELETE FROM grant_application_generation_jobs WHERE id = '{job_id}'")
        )
        await session.commit()

    
    response = await test_client.get(
        f"/organizations/{project.organization_id}/projects/{project.id}/rag-jobs/{job_id}",
        headers={"Authorization": f"Bearer {otp_code}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND, response.text
