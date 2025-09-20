from abc import ABC, abstractmethod
from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any, Literal, cast
from uuid import UUID

from packages.db.src.enums import RagGenerationStatusEnum
from packages.db.src.tables import (
    GenerationNotification,
    GrantApplicationGenerationJob,
    GrantTemplateGenerationJob,
    RagGenerationJob,
)
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import DatabaseError, RagJobCancelledError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import RagProcessingStatus, publish_notification
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


class BaseJobManager[T: RagGenerationJob, E, D](ABC):
    __slots__ = ("current_stage", "grant_application_id", "job_id", "parent_id", "pipeline_stages", "session_maker")

    job: None | RagGenerationJob = None

    def __init__(
        self,
        *,
        current_stage: E,
        grant_application_id: UUID,
        job_id: UUID | None = None,
        parent_id: UUID,
        pipeline_stages: list[E],
        session_maker: async_sessionmaker[Any],
    ) -> None:
        self.current_stage = current_stage
        self.grant_application_id = grant_application_id
        self.job_id = job_id
        self.parent_id = parent_id
        self.session_maker = session_maker
        self.pipeline_stages = pipeline_stages

    @abstractmethod
    async def get_or_create_job(self) -> T:
        pass

    async def to_next_job_stage(self, dto: D) -> None:
        next_stage = self.pipeline_stages[self.pipeline_stages.index(self.current_stage) + 1]

        async with self.session_maker() as session:
            self.job.checkpoint_data = dto

            session.add(self.job)
            await session.commit()

        # TODO - publish to pubsub here - this is where we are publishing the next rag processing message in the pipeline

    async def update_job_status(
        self,
        status: RagGenerationStatusEnum,
        error_message: str | None = None,
        error_details: dict[str, Any] | None = None,
    ) -> None:
        if not self.job_id:
            raise RuntimeError("Job ID not set. Create a job first.")

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

    async def add_notification(
        self,
        *,
        event: str,
        message: str,
        notification_type: Literal["info", "error", "warning", "success"] = "info",
        data: Mapping[str, Any] | None = None,
    ) -> None:
        logger.debug("Adding notification to job", job_id=str(self.job_id), message=message, notification_event=event)

        async with self.session_maker() as session:
            notification = GenerationNotification(
                rag_job_id=self.job_id,
                event=event,
                message=message,
                notification_type=notification_type,
                data=data,
                current_pipeline_stage=self.pipeline_stages.index(self.current_stage),
                total_pipeline_stages=len(self.pipeline_stages),
            )
            session.add(notification)
            await session.commit()

        status_data: RagProcessingStatus = {
            "event": event,
            "message": message,
            "current_pipeline_stage": notification["current_pipeline_stage"],
            "total_pipeline_stages": notification["total_pipeline_stages"],
        }

        if data is not None:
            status_data["data"] = data

        await publish_notification(
            parent_id=self.grant_application_id,
            event=event,
            data=status_data,
        )

    async def increment_retry_count(self) -> int:
        async with self.session_maker() as session:
            result = await session.execute(select(RagGenerationJob).where(RagGenerationJob.id == self.job_id))
            job = result.scalar_one()

            job.retry_count += 1
            await session.commit()
            return int(job.retry_count)

    async def get_job_notifications(self, limit: int | None = None) -> list[GenerationNotification]:
        async with self.session_maker() as session:
            query = (
                select(GenerationNotification)
                .where(GenerationNotification.rag_job_id == self.job_id)
                .order_by(GenerationNotification.created_at.desc())
            )

            if limit:
                query = query.limit(limit)

            result = await session.execute(query)
            return list(result.scalars().all())

    async def ensure_not_cancelled(self) -> None:
        async with self.session_maker() as session:
            await session.refresh(self.job)

        if self.job.status == RagGenerationStatusEnum.CANCELLED:
            await self.add_notification(
                event=NotificationEvents.CANCELLATION_ACKNOWLEDGED,
                message="Processing stopped due to cancellation",
                notification_type="warning",
            )
            raise RagJobCancelledError


class GrantTemplateJobManager[E, D](BaseJobManager[GrantTemplateGenerationJob, E, D]):
    async def get_or_create_job(self) -> GrantTemplateGenerationJob:
        logger.debug(
            "Getting or creating rag job job",
            template_id=str(self.parent_id),
        )

        async with self.session_maker() as session, session.begin():
            logger.debug(
                "Checking for existing job",
                template_id=str(self.parent_id),
            )
            try:
                existing_job_result = await session.execute(
                    select(GrantTemplateGenerationJob).where(
                        GrantTemplateGenerationJob.grant_template_id == self.parent_id
                    )
                )
                existing_job = cast("GrantTemplateGenerationJob | None", existing_job_result.scalar_one_or_none())

                if existing_job:
                    logger.info(
                        "Job already exists for template, returning existing job",
                        template_id=str(self.parent_id),
                        job_id=str(existing_job.id),
                        job_status=existing_job.status.value,
                    )
                    self.job_id = existing_job.id
                    return existing_job

                job = GrantTemplateGenerationJob(
                    grant_template_id=self.parent_id,
                    total_stages=len(self.pipeline_stages),
                    status=RagGenerationStatusEnum.PENDING,
                    current_stage=0,
                    retry_count=0,
                )
                session.add(job)
                await session.flush()
                await session.commit()

                self.job_id = job.id
                self.job = job
                logger.info("Created new job for template", template_id=str(self.parent_id), job_id=str(job.id))

                return job
            except SQLAlchemyError as e:
                logger.error("Error inserting rag job into db", error=e)
                raise DatabaseError("Error inserting rag job into db") from e


class GrantApplicationJobManager[D](BaseJobManager[D]):
    async def get_or_create_job(self) -> GrantApplicationGenerationJob:
        async with self.session_maker() as session, session.begin():
            try:
                existing_job_result = await session.execute(
                    select(GrantApplicationGenerationJob).where(
                        GrantApplicationGenerationJob.grant_application_id == self.parent_id
                    )
                )
                existing_job = cast("GrantApplicationGenerationJob | None", existing_job_result.scalar_one_or_none())

                if existing_job:
                    logger.info(
                        "Job already exists for application, returning existing job",
                        application_id=str(self.parent_id),
                        job_id=str(existing_job.id),
                    )
                    self.job_id = existing_job.id
                    return existing_job

                job = GrantApplicationGenerationJob(
                    grant_application_id=self.parent_id,
                    total_stages=len(self.pipeline_stages),
                    status=RagGenerationStatusEnum.PENDING,
                    current_stage=0,
                    retry_count=0,
                )
                session.add(job)
                await session.flush()
                await session.commit()

                self.job_id = job.id
                self.job = job
                logger.info("Created new job for application", application_id=str(self.parent_id), job_id=str(job.id))

                return job
            except SQLAlchemyError as e:
                logger.error("Error inserting rag job into db", error=e)
                raise DatabaseError("Error inserting rag job into db") from e

    async def to_next_job_stage(
        self,
        dto: D,
    ) -> None:
        # TODO
        raise NotImplementedError
