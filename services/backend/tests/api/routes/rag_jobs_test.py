from datetime import UTC, datetime
from http import HTTPStatus
from typing import Any
from uuid import uuid4

import pytest
from packages.db.src.enums import GrantApplicationStageEnum, GrantTemplateStageEnum, RagGenerationStatusEnum
from packages.db.src.tables import (
    GenerationNotification,
    GrantApplication,
    GrantTemplate,
    OrganizationUser,
    Project,
    RagGenerationJob,
)
from packages.shared_utils.src.constants import NotificationEvents
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import (
    ProjectFactory,
    RagGenerationJobFactory,
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
        job = RagGenerationJobFactory.build(
            grant_template_id=grant_template.id,
            grant_application_id=None,
            status=RagGenerationStatusEnum.PROCESSING,
            template_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
            application_stage=None,
            checkpoint_data={
                "extracted_sections": [{"id": "section1", "title": "Introduction"}],
                "extracted_metadata": {"key": "value"},
            },
            started_at=datetime.now(UTC),
            retry_count=2,
            error_message=None,
        )
        session.add(job)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{job.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["id"] == str(job.id)
    assert data["job_type"] == "grant_template_generation"
    assert data["status"] == RagGenerationStatusEnum.PROCESSING.value
    assert data["current_stage"] == GrantTemplateStageEnum.CFP_ANALYSIS.value
    assert data["grant_template_id"] == str(grant_template.id)
    assert data["extracted_sections"] == [{"id": "section1", "title": "Introduction"}]
    assert data["extracted_metadata"] == {"key": "value"}
    assert data["retry_count"] == 2
    assert "started_at" in data
    assert "grant_application_id" not in data


async def test_retrieve_grant_application_job_success(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            grant_template_id=None,
            status=RagGenerationStatusEnum.PROCESSING,
            application_stage=GrantApplicationStageEnum.SECTION_SYNTHESIS,
            template_stage=None,
            checkpoint_data={
                "generated_sections": {"intro": "Content"},
                "validation_results": {"valid": True},
            },
            started_at=datetime.now(UTC),
            retry_count=0,
        )
        session.add(job)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{job.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["id"] == str(job.id)
    assert data["job_type"] == "grant_application_generation"
    assert data["status"] == RagGenerationStatusEnum.PROCESSING.value
    assert data["current_stage"] == GrantApplicationStageEnum.SECTION_SYNTHESIS.value
    assert data["grant_application_id"] == str(grant_application.id)
    assert data["generated_sections"] == {"intro": "Content"}
    assert data["validation_results"] == {"valid": True}
    assert data["retry_count"] == 0
    assert "grant_template_id" not in data


async def test_retrieve_job_with_error_details(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            grant_template_id=None,
            status=RagGenerationStatusEnum.FAILED,
            application_stage=GrantApplicationStageEnum.BLUEPRINT_PREP,
            template_stage=None,
            error_message="LLM API timeout",
            error_details={"error_code": "TIMEOUT", "retry_after": 60},
            failed_at=datetime.now(UTC),
        )
        session.add(job)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{job.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["status"] == RagGenerationStatusEnum.FAILED.value
    assert data["error_message"] == "LLM API timeout"
    assert data["error_details"] == {"error_code": "TIMEOUT", "retry_after": 60}
    assert "failed_at" in data


async def test_retrieve_job_with_parent_child_chain(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        parent_job = RagGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            grant_template_id=None,
            status=RagGenerationStatusEnum.COMPLETED,
            application_stage=GrantApplicationStageEnum.SECTION_SYNTHESIS,
            template_stage=None,
            completed_at=datetime.now(UTC),
            checkpoint_data={"sections": ["intro", "methods"]},
        )
        session.add(parent_job)
        await session.flush()

        child_job = RagGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            grant_template_id=None,
            status=RagGenerationStatusEnum.PROCESSING,
            application_stage=GrantApplicationStageEnum.BLUEPRINT_PREP,
            template_stage=None,
            parent_job_id=parent_job.id,
        )
        session.add(child_job)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{child_job.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["current_stage"] == GrantApplicationStageEnum.BLUEPRINT_PREP.value


async def test_retrieve_job_not_found(
    test_client: TestingClientType,
    project: Project,
    project_member_user: OrganizationUser,
) -> None:
    non_existent_job_id = uuid4()
    response = await test_client.get(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{non_existent_job_id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


async def test_retrieve_job_from_different_project(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        other_project = ProjectFactory.build(
            organization_id=project.organization_id,
            name="Other Project",
        )
        session.add(other_project)
        await session.flush()

        other_app = GrantApplication(
            title="Other App",
            project_id=other_project.id,
        )
        session.add(other_app)
        await session.flush()

        job = RagGenerationJobFactory.build(
            grant_application_id=other_app.id,
            grant_template_id=None,
            status=RagGenerationStatusEnum.PENDING,
            application_stage=GrantApplicationStageEnum.SECTION_SYNTHESIS,
            template_stage=None,
        )
        session.add(job)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{job.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


async def test_cancel_job_success(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            grant_template_id=None,
            status=RagGenerationStatusEnum.PROCESSING,
            application_stage=GrantApplicationStageEnum.SECTION_SYNTHESIS,
            template_stage=None,
        )
        session.add(job)
        await session.commit()

    response = await test_client.delete(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{job.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        cancelled_job = await session.get(RagGenerationJob, job.id)
        assert cancelled_job.status == RagGenerationStatusEnum.CANCELLED

        notification = await session.scalar(
            select(GenerationNotification).where(GenerationNotification.rag_job_id == job.id)
        )
        if notification:
            assert notification.event == NotificationEvents.JOB_CANCELLED


async def test_cancel_already_completed_job(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            grant_template_id=None,
            status=RagGenerationStatusEnum.COMPLETED,
            application_stage=GrantApplicationStageEnum.SECTION_SYNTHESIS,
            template_stage=None,
            completed_at=datetime.now(UTC),
        )
        session.add(job)
        await session.commit()

    response = await test_client.delete(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{job.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        job_after = await session.get(RagGenerationJob, job.id)
        assert job_after.status == RagGenerationStatusEnum.COMPLETED


async def test_cancel_already_cancelled_job(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            grant_template_id=None,
            status=RagGenerationStatusEnum.CANCELLED,
            application_stage=GrantApplicationStageEnum.BLUEPRINT_PREP,
            template_stage=None,
        )
        session.add(job)
        await session.commit()

    response = await test_client.delete(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{job.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        job_after = await session.get(RagGenerationJob, job.id)
        assert job_after.status == RagGenerationStatusEnum.CANCELLED


async def test_cancel_pending_job(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJobFactory.build(
            grant_template_id=grant_template.id,
            grant_application_id=None,
            status=RagGenerationStatusEnum.PENDING,
            template_stage=GrantTemplateStageEnum.CFP_ANALYSIS,
            application_stage=None,
        )
        session.add(job)
        await session.commit()

    response = await test_client.delete(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{job.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        cancelled_job = await session.get(RagGenerationJob, job.id)
        assert cancelled_job.status == RagGenerationStatusEnum.CANCELLED


async def test_cancel_job_not_found(
    test_client: TestingClientType,
    project: Project,
    project_member_user: OrganizationUser,
) -> None:
    non_existent_job_id = uuid4()
    response = await test_client.delete(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{non_existent_job_id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


async def test_retrieve_job_with_multiple_stages(
    test_client: TestingClientType,
    project: Project,
    grant_template: GrantTemplate,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    stages = [
        GrantTemplateStageEnum.CFP_ANALYSIS,
        GrantTemplateStageEnum.CFP_ANALYSIS,
        GrantTemplateStageEnum.TEMPLATE_GENERATION,
    ]

    job_ids = []
    async with async_session_maker() as session, session.begin():
        parent_id = None
        for i, stage in enumerate(stages):
            job = RagGenerationJobFactory.build(
                grant_template_id=grant_template.id,
                grant_application_id=None,
                status=RagGenerationStatusEnum.COMPLETED if i < len(stages) - 1 else RagGenerationStatusEnum.PROCESSING,
                template_stage=stage,
                application_stage=None,
                parent_job_id=parent_id,
                checkpoint_data={"stage_index": i},
            )
            session.add(job)
            await session.flush()
            parent_id = job.id
            job_ids.append(job.id)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{job_ids[-1]}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["current_stage"] == GrantTemplateStageEnum.TEMPLATE_GENERATION.value
    assert data["status"] == RagGenerationStatusEnum.PROCESSING.value


async def test_job_without_checkpoint_data(
    test_client: TestingClientType,
    project: Project,
    grant_application: GrantApplication,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: OrganizationUser,
) -> None:
    async with async_session_maker() as session, session.begin():
        job = RagGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            grant_template_id=None,
            status=RagGenerationStatusEnum.PENDING,
            application_stage=GrantApplicationStageEnum.WORKPLAN_GENERATION,
            template_stage=None,
            checkpoint_data=None,
        )
        session.add(job)
        await session.commit()

    response = await test_client.get(
        f"/organizations/{project_member_user.organization_id}/projects/{project.id}/rag-jobs/{job.id}",
        headers={"Authorization": f"Bearer {project_member_user.firebase_uid}"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert "generated_sections" not in data
    assert "validation_results" not in data
