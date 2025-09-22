from typing import Any, NotRequired, TypedDict
from uuid import UUID

from litestar import delete, get
from litestar.exceptions import NotFoundException
from packages.db.src.enums import RagGenerationStatusEnum, UserRoleEnum
from packages.db.src.tables import (
    GenerationNotification,
    GrantApplication,
    GrantTemplate,
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
    current_stage: str | None
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
    async with session_maker() as session:
        job = await session.scalar(select(RagGenerationJob).where(RagGenerationJob.id == job_id))

        if not job:
            raise NotFoundException("RAG job not found")

        project_match = False
        job_type = "unknown"
        current_stage = None

        if job.grant_template_id:
            template = await session.scalar(
                select(GrantTemplate)
                .join(GrantApplication, GrantTemplate.grant_application_id == GrantApplication.id)
                .where(
                    GrantTemplate.id == job.grant_template_id,
                    GrantTemplate.deleted_at.is_(None),
                    GrantApplication.project_id == project_id,
                    GrantApplication.deleted_at.is_(None),
                )
            )
            project_match = template is not None
            job_type = "grant_template_generation"
            current_stage = job.template_stage.value if job.template_stage else None
        elif job.grant_application_id:
            application = await session.scalar(
                select(GrantApplication).where(
                    GrantApplication.id == job.grant_application_id,
                    GrantApplication.project_id == project_id,
                    GrantApplication.deleted_at.is_(None),
                )
            )
            project_match = application is not None
            job_type = "grant_application_generation"
            current_stage = job.application_stage.value if job.application_stage else None

        if not project_match:
            raise NotFoundException("RAG job not found")

        response: RagJobResponse = {
            "id": str(job.id),
            "job_type": job_type,
            "status": job.status,
            "current_stage": current_stage,
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

        if job.grant_template_id:
            response["grant_template_id"] = str(job.grant_template_id)
            if job.checkpoint_data:
                if "extracted_sections" in job.checkpoint_data:
                    response["extracted_sections"] = job.checkpoint_data["extracted_sections"]
                if "extracted_metadata" in job.checkpoint_data:
                    response["extracted_metadata"] = job.checkpoint_data["extracted_metadata"]

        elif job.grant_application_id:
            response["grant_application_id"] = str(job.grant_application_id)
            if job.checkpoint_data:
                if "generated_sections" in job.checkpoint_data:
                    response["generated_sections"] = job.checkpoint_data["generated_sections"]
                if "validation_results" in job.checkpoint_data:
                    response["validation_results"] = job.checkpoint_data["validation_results"]

        return response


async def cancel_rag_job_by_id(
    project_id: UUID,
    job_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> None:
    async with session_maker() as session, session.begin():
        job = await session.scalar(select(RagGenerationJob).where(RagGenerationJob.id == job_id))

        if not job:
            raise NotFoundException("RAG job not found")

        project_match = False
        if job.grant_template_id:
            template = await session.scalar(
                select(GrantTemplate)
                .join(GrantApplication, GrantTemplate.grant_application_id == GrantApplication.id)
                .where(
                    GrantTemplate.id == job.grant_template_id,
                    GrantTemplate.deleted_at.is_(None),
                    GrantApplication.project_id == project_id,
                    GrantApplication.deleted_at.is_(None),
                )
            )
            project_match = template is not None
        elif job.grant_application_id:
            application = await session.scalar(
                select(GrantApplication).where(
                    GrantApplication.id == job.grant_application_id,
                    GrantApplication.project_id == project_id,
                    GrantApplication.deleted_at.is_(None),
                )
            )
            project_match = application is not None

        if not project_match:
            raise NotFoundException("RAG job not found")

        if job.status in [RagGenerationStatusEnum.COMPLETED, RagGenerationStatusEnum.CANCELLED]:
            logger.info("Job already complete or cancelled", job_id=str(job.id), status=job.status.value)
            return

        job.status = RagGenerationStatusEnum.CANCELLED

        notification = GenerationNotification(
            rag_job_id=job.id,
            event=NotificationEvents.JOB_CANCELLED,
            message="Job has been cancelled by user request",
            notification_type="warning",
        )
        session.add(notification)

        logger.info("Job cancelled successfully", job_id=str(job.id))


@delete(
    "/organizations/{organization_id:uuid}/projects/{project_id:uuid}/rag-jobs/{job_id:uuid}",
    allowed_roles=[UserRoleEnum.OWNER, UserRoleEnum.ADMIN, UserRoleEnum.COLLABORATOR],
    status_code=204,
    operation_id="CancelRagJob",
)
async def handle_cancel_rag_job(
    *,
    project_id: UUID,
    job_id: UUID,
    session_maker: async_sessionmaker[Any],
) -> None:
    await cancel_rag_job_by_id(project_id, job_id, session_maker)
