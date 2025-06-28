from datetime import UTC, datetime
from typing import Any, Literal, cast
from uuid import UUID

from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationGenerationJob,
    GrantTemplate,
    GrantTemplateGenerationJob,
    RagGenerationJob,
    RagGenerationNotification,
)
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import RagProcessingStatus, publish_notification
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class JobManager:
    """Manages RAG generation job lifecycle and notifications."""

    def __init__(self, session_maker: async_sessionmaker[Any], job_id: UUID | None = None) -> None:
        self.session_maker = session_maker
        self.job_id = job_id

    async def create_grant_template_job(self, grant_template_id: UUID, total_stages: int) -> GrantTemplateGenerationJob:
        """Create a new grant template generation job or return existing one."""
        logger.debug(
            "Attempting to create grant template job",
            template_id=str(grant_template_id),
            total_stages=total_stages,
        )

        async with self.session_maker() as session:
            logger.debug(
                "Checking for existing job",
                template_id=str(grant_template_id),
            )
            existing_job_result = await session.execute(
                select(GrantTemplateGenerationJob).where(
                    GrantTemplateGenerationJob.grant_template_id == grant_template_id
                )
            )
            existing_job = cast("GrantTemplateGenerationJob | None", existing_job_result.scalar_one_or_none())

            if existing_job:
                logger.info(
                    "Job already exists for template, returning existing job",
                    template_id=str(grant_template_id),
                    job_id=str(existing_job.id),
                    job_status=existing_job.status.value,
                )
                self.job_id = existing_job.id
                return existing_job

            logger.debug(
                "Verifying grant template exists before creating job",
                template_id=str(grant_template_id),
            )
            template_result = await session.execute(select(GrantTemplate).where(GrantTemplate.id == grant_template_id))
            template = template_result.scalar_one_or_none()

            if template is None:
                logger.warning(
                    "Grant template not found, cannot create job - template may have been deleted",
                    template_id=str(grant_template_id),
                )
                msg = f"Grant template {grant_template_id} not found"
                raise ValueError(msg)

            logger.debug(
                "Grant template found, proceeding with job creation",
                template_id=str(grant_template_id),
                template_grant_application_id=str(template.grant_application_id),
                template_existing_rag_job_id=str(template.rag_job_id) if template.rag_job_id else None,
            )

            job = GrantTemplateGenerationJob(
                grant_template_id=grant_template_id,
                total_stages=total_stages,
                status=RagGenerationStatusEnum.PENDING,
                current_stage=0,
                retry_count=0,
            )
            logger.debug(
                "Adding job to session",
                template_id=str(grant_template_id),
                job_id=str(job.id),
            )
            session.add(job)
            await session.flush()

            logger.debug(
                "Updating template with job ID",
                template_id=str(grant_template_id),
                job_id=str(job.id),
            )
            template.rag_job_id = job.id

            logger.debug(
                "Committing job creation transaction",
                template_id=str(grant_template_id),
                job_id=str(job.id),
            )
            await session.commit()
            self.job_id = job.id
            logger.info("Created new job for template", template_id=str(grant_template_id), job_id=str(job.id))
            return job

    async def create_grant_application_job(
        self, grant_application_id: UUID, total_stages: int
    ) -> GrantApplicationGenerationJob:
        """Create a new grant application generation job or return existing one."""
        async with self.session_maker() as session:
            existing_job_result = await session.execute(
                select(GrantApplicationGenerationJob).where(
                    GrantApplicationGenerationJob.grant_application_id == grant_application_id
                )
            )
            existing_job = cast("GrantApplicationGenerationJob | None", existing_job_result.scalar_one_or_none())

            if existing_job:
                logger.info(
                    "Job already exists for application, returning existing job",
                    application_id=str(grant_application_id),
                    job_id=str(existing_job.id),
                )
                self.job_id = existing_job.id
                return existing_job

            job = GrantApplicationGenerationJob(
                grant_application_id=grant_application_id,
                total_stages=total_stages,
                status=RagGenerationStatusEnum.PENDING,
                current_stage=0,
                retry_count=0,
            )
            session.add(job)
            await session.flush()

            result = await session.execute(select(GrantApplication).where(GrantApplication.id == grant_application_id))
            application = result.scalar_one()
            application.rag_job_id = job.id

            await session.commit()
            self.job_id = job.id
            logger.info("Created new job for application", application_id=str(grant_application_id), job_id=str(job.id))
            return job

    async def update_job_status(
        self,
        status: RagGenerationStatusEnum,
        error_message: str | None = None,
        error_details: dict[str, Any] | None = None,
    ) -> None:
        """Update job status and related timestamps."""
        if not self.job_id:
            raise ValueError("Job ID not set. Create a job first.")

        async with self.session_maker() as session:
            result = await session.execute(select(RagGenerationJob).where(RagGenerationJob.id == self.job_id))
            job = result.scalar_one()

            job.status = status

            if status == RagGenerationStatusEnum.PROCESSING and job.started_at is None:
                job.started_at = datetime.now(UTC)
            elif status == RagGenerationStatusEnum.COMPLETED:
                job.completed_at = datetime.now(UTC)
            elif status == RagGenerationStatusEnum.FAILED:
                job.failed_at = datetime.now(UTC)
                job.error_message = error_message
                job.error_details = error_details

            await session.commit()

    async def update_job_stage(
        self,
        current_stage: int,
        checkpoint_data: dict[str, Any] | None = None,
    ) -> None:
        """Update job progress stage and checkpoint data."""
        if not self.job_id:
            raise ValueError("Job ID not set. Create a job first.")

        async with self.session_maker() as session:
            result = await session.execute(select(RagGenerationJob).where(RagGenerationJob.id == self.job_id))
            job = result.scalar_one()

            job.current_stage = current_stage
            if checkpoint_data:
                job.checkpoint_data = checkpoint_data

            await session.commit()

    async def add_notification(
        self,
        parent_id: UUID,
        event: str,
        message: str,
        notification_type: Literal["info", "error", "warning", "success"] = "info",
        data: dict[str, Any] | None = None,
        current_pipeline_stage: int | None = None,
        total_pipeline_stages: int | None = None,
    ) -> None:
        """Add a notification to the job history and publish it."""
        if not self.job_id:
            raise ValueError("Job ID not set. Create a job first.")

        async with self.session_maker() as session:
            notification = RagGenerationNotification(
                rag_job_id=self.job_id,
                event=event,
                message=message,
                notification_type=notification_type,
                data=data,
                current_pipeline_stage=current_pipeline_stage,
                total_pipeline_stages=total_pipeline_stages,
            )
            session.add(notification)

            if current_pipeline_stage is not None:
                await session.execute(select(RagGenerationJob).where(RagGenerationJob.id == self.job_id))
                job = await session.get(RagGenerationJob, self.job_id)
                if job:
                    job.current_stage = current_pipeline_stage

            await session.commit()

        status_data: RagProcessingStatus = {
            "event": event,
            "message": message,
        }
        if data is not None:
            status_data["data"] = data
        if current_pipeline_stage is not None:
            status_data["current_pipeline_stage"] = current_pipeline_stage
        if total_pipeline_stages is not None:
            status_data["total_pipeline_stages"] = total_pipeline_stages

        await publish_notification(
            logger=logger,
            parent_id=parent_id,
            event=event,
            data=status_data,
        )

    async def increment_retry_count(self) -> int:
        """Increment the retry count for a job and return the new count."""
        if not self.job_id:
            raise ValueError("Job ID not set. Create a job first.")

        async with self.session_maker() as session:
            result = await session.execute(select(RagGenerationJob).where(RagGenerationJob.id == self.job_id))
            job = result.scalar_one()

            job.retry_count += 1
            await session.commit()
            return int(job.retry_count)

    async def get_job(self) -> RagGenerationJob | None:
        """Get the current job."""
        if not self.job_id:
            raise ValueError("Job ID not set. Create a job first.")

        async with self.session_maker() as session:
            return cast(
                "RagGenerationJob | None",
                await session.scalar(select(RagGenerationJob).where(RagGenerationJob.id == self.job_id)),
            )

    async def get_job_notifications(self, limit: int | None = None) -> list[RagGenerationNotification]:
        """Get notifications for the current job, ordered by creation time."""
        if not self.job_id:
            raise ValueError("Job ID not set. Create a job first.")

        async with self.session_maker() as session:
            query = (
                select(RagGenerationNotification)
                .where(RagGenerationNotification.rag_job_id == self.job_id)
                .order_by(RagGenerationNotification.created_at.desc())
            )

            if limit:
                query = query.limit(limit)

            result = await session.execute(query)
            return list(result.scalars().all())
