from datetime import UTC, datetime
from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import delete, get
from litestar.exceptions import NotFoundException
from packages.db.src.enums import RagGenerationStatusEnum, UserRoleEnum
from packages.db.src.tables import (
    GenerationNotification,
    GrantApplication,
    GrantApplicationGenerationJob,
    GrantTemplate,
    GrantTemplateGenerationJob,
    RagGenerationJob,
)
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class RagJobResponse(TypedDict):
    id: str
    job_type: str
    status: RagGenerationStatusEnum
    current_stage: int
    total_stages: int
    retry_count: int
    error_message: NotRequired[str]
    error_details: NotRequired[dict[str, Any]]
    started_at: NotRequired[str]
    completed_at: NotRequired[str]
    failed_at: NotRequired[str]
    created_at: str
    updated_at: str

    grant_template_id: NotRequired[str]
    grant_application_id: NotRequired[str]
    extracted_sections: NotRequired[list[dict[str, Any]]]
    extracted_metadata: NotRequired[dict[str, Any]]
    generated_sections: NotRequired[dict[str, str]]
    validation_results: NotRequired[dict[str, Any]]


@get(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/rag-jobs/{job_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="RetrieveRagJob",
)
async def handle_retrieve_rag_job(
    *,
    project_id: UUID,
    job_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> RagJobResponse:
    # Retrieving RAG job

    async with session_maker() as session:
        job = await session.scalar(select(RagGenerationJob).where(RagGenerationJob.id == job_id))

        if not job:
            raise NotFoundException("RAG job not found")

        project_match = False
        if job.job_type == "grant_template_generation":
            template_job = await session.scalar(
                select(GrantTemplateGenerationJob).where(GrantTemplateGenerationJob.id == job_id)
            )
            if template_job:
                template = await session.scalar(
                    select(GrantTemplate)
                    .join(GrantApplication, GrantTemplate.grant_application_id == GrantApplication.id)
                    .where(
                        GrantTemplate.id == template_job.grant_template_id,
                        GrantTemplate.deleted_at.is_(None),
                        GrantApplication.project_id == project_id,
                        GrantApplication.deleted_at.is_(None),
                    )
                )
                project_match = template is not None
        elif job.job_type == "grant_application_generation":
            app_job = await session.scalar(
                select(GrantApplicationGenerationJob).where(GrantApplicationGenerationJob.id == job_id)
            )
            if app_job:
                application = await session.scalar(
                    select(GrantApplication).where(
                        GrantApplication.id == app_job.grant_application_id,
                        GrantApplication.project_id == project_id,
                        GrantApplication.deleted_at.is_(None),
                    )
                )
                project_match = application is not None

        if not project_match:
            raise NotFoundException("RAG job not found")

        response: RagJobResponse = {
            "id": str(job.id),
            "job_type": job.job_type,
            "status": job.status,
            "current_stage": job.current_stage,
            "total_stages": job.total_stages,
            "retry_count": job.retry_count,
            "created_at": job.created_at.isoformat(),
            "updated_at": job.updated_at.isoformat(),
        }

        if job.error_message:
            response["error_message"] = job.error_message

        if job.error_details:
            response["error_details"] = job.error_details

        if job.started_at:
            response["started_at"] = job.started_at.isoformat()

        if job.completed_at:
            response["completed_at"] = job.completed_at.isoformat()

        if job.failed_at:
            response["failed_at"] = job.failed_at.isoformat()

        if job.job_type == "grant_template_generation":
            template_job = await session.scalar(
                select(GrantTemplateGenerationJob).where(GrantTemplateGenerationJob.id == job_id)
            )
            if template_job:
                response["grant_template_id"] = str(template_job.grant_template_id)
                if template_job.extracted_sections:
                    response["extracted_sections"] = template_job.extracted_sections
                if template_job.extracted_metadata:
                    response["extracted_metadata"] = template_job.extracted_metadata

        elif job.job_type == "grant_application_generation":
            app_job = await session.scalar(
                select(GrantApplicationGenerationJob).where(GrantApplicationGenerationJob.id == job_id)
            )
            if app_job:
                response["grant_application_id"] = str(app_job.grant_application_id)
                if app_job.generated_sections:
                    response["generated_sections"] = app_job.generated_sections
                if app_job.validation_results:
                    response["validation_results"] = app_job.validation_results

        return response


async def cancel_rag_job_by_id(
    project_id: UUID,
    job_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> None:
    # Cancelling RAG job

    async with session_maker() as session, session.begin():
        job = await session.scalar(select(RagGenerationJob).where(RagGenerationJob.id == job_id))

        if not job:
            raise NotFoundException("RAG job not found")

        project_match = False
        if job.job_type == "grant_template_generation":
            template_job = await session.scalar(
                select(GrantTemplateGenerationJob).where(GrantTemplateGenerationJob.id == job_id)
            )
            if template_job:
                template = await session.scalar(
                    select(GrantTemplate)
                    .join(GrantApplication, GrantTemplate.grant_application_id == GrantApplication.id)
                    .where(
                        GrantTemplate.id == template_job.grant_template_id,
                        GrantTemplate.deleted_at.is_(None),
                        GrantApplication.project_id == project_id,
                        GrantApplication.deleted_at.is_(None),
                    )
                )
                project_match = template is not None
        elif job.job_type == "grant_application_generation":
            app_job = await session.scalar(
                select(GrantApplicationGenerationJob).where(GrantApplicationGenerationJob.id == job_id)
            )
            if app_job:
                application = await session.scalar(
                    select(GrantApplication).where(
                        GrantApplication.id == app_job.grant_application_id,
                        GrantApplication.project_id == project_id,
                        GrantApplication.deleted_at.is_(None),
                    )
                )
                project_match = application is not None

        if not project_match:
            raise NotFoundException("RAG job not found")

        if job.status in [RagGenerationStatusEnum.PENDING, RagGenerationStatusEnum.PROCESSING]:
            previous_status = job.status
            job.status = RagGenerationStatusEnum.CANCELLED
            job.failed_at = datetime.now(UTC)
            job.error_message = "Cancelled by user request"

            notification = GenerationNotification(
                rag_job_id=job_id,
                event=NotificationEvents.JOB_CANCELLED,
                message="Generation cancelled by user",
                notification_type="warning",
            )
            session.add(notification)

            # RAG job cancelled successfully
        else:
            # RAG job not in cancellable state


@delete(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/rag-jobs/{job_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    operation_id="CancelRagJob",
)
async def handle_cancel_rag_job(
    *,
    project_id: UUID,
    job_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> None:
    await cancel_rag_job_by_id(project_id, job_id, session_maker)
