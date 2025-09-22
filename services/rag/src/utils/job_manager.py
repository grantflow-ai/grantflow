from abc import ABC, abstractmethod
from datetime import UTC, datetime
from typing import Any, Literal, cast
from uuid import UUID

from packages.db.src.enums import GrantApplicationStageEnum, GrantTemplateStageEnum, RagGenerationStatusEnum
from packages.db.src.query_helpers import select_active, update_active_by_id
from packages.db.src.tables import (
    GenerationNotification,
    GrantApplicationGenerationJob,
    GrantTemplateGenerationJob,
    RagGenerationJob,
)
from packages.shared_utils.src.constants import NotificationEvents
from packages.shared_utils.src.exceptions import DatabaseError, RagJobCancelledError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import RagProcessingStatus, publish_notification, publish_rag_task
from packages.shared_utils.src.serialization import to_builtins
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


def _serialize_checkpoint_data[DTOType](data: DTOType) -> dict[str, Any]:
    return cast("dict[str, Any]", to_builtins(data))


class BaseJobManager[
    JobT: RagGenerationJob,
    StageT: GrantApplicationStageEnum | GrantTemplateStageEnum,
    DTOType,
](ABC):
    __slots__ = (
        "current_stage",
        "grant_application_id",
        "job",
        "job_id",
        "parent_id",
        "pipeline_stages",
        "session_maker",
        "trace_id",
    )
    parent_type: Literal["grant_application", "grant_template"]

    def __init__(
        self,
        *,
        current_stage: StageT,
        grant_application_id: UUID,
        job_id: UUID | None = None,
        parent_id: UUID,
        pipeline_stages: list[StageT],
        session_maker: async_sessionmaker[Any],
        trace_id: str,
    ) -> None:
        self.current_stage = current_stage
        self.grant_application_id = grant_application_id
        self.job_id = job_id
        self.parent_id = parent_id
        self.session_maker = session_maker
        self.pipeline_stages = pipeline_stages
        self.trace_id = trace_id
        self.job: JobT | None = None

    @abstractmethod
    async def get_or_create_job(self) -> JobT: ...

    def _get_job_table(self) -> type[GrantTemplateGenerationJob] | type[GrantApplicationGenerationJob]:
        if self.parent_type == "grant_template":
            return GrantTemplateGenerationJob
        return GrantApplicationGenerationJob

    async def _handle_zero_rows_updated(self, expected_stage: StageT, session: Any) -> None:
        job = await session.scalar(select_active(self._get_job_table()).where(self._get_job_table().id == self.job_id))

        if not job:
            raise RuntimeError(f"Job {self.job_id} not found")

        if job.status == RagGenerationStatusEnum.CANCELLED:
            raise RagJobCancelledError(f"Job {self.job_id} was cancelled")

        if job.current_stage is None:
            raise RuntimeError(f"Job {self.job_id} has null current_stage")

        try:
            current_stage_index = self.pipeline_stages.index(job.current_stage)
            expected_stage_index = self.pipeline_stages.index(expected_stage)
        except ValueError as e:
            raise RuntimeError(f"Invalid stage found in job {self.job_id}: {job.current_stage}") from e

        if current_stage_index > expected_stage_index:
            logger.info(
                "Stage transition skipped - duplicate message",
                job_id=str(self.job_id),
                parent_type=self.parent_type,
                parent_id=str(self.parent_id),
                expected_stage=expected_stage,
                actual_stage=job.current_stage,
                trace_id=self.trace_id,
            )
        elif current_stage_index == expected_stage_index:
            logger.warning(
                "Stage update failed despite matching stage - possible concurrency issue",
                job_id=str(self.job_id),
                parent_type=self.parent_type,
                parent_id=str(self.parent_id),
                stage=job.current_stage,
                trace_id=self.trace_id,
            )
        else:
            raise RuntimeError(
                f"Job stage regression: expected {expected_stage} but found {job.current_stage}. "
                f"Job {self.job_id} may be corrupted."
            )

        self.current_stage = job.current_stage
        self.job = job

    async def to_next_job_stage(self, dto: DTOType) -> None:
        current_index = self.pipeline_stages.index(self.current_stage)
        if current_index >= len(self.pipeline_stages) - 1:
            raise ValueError(f"No next stage after {self.current_stage}")

        if self.job_id is None:
            raise RuntimeError("Job ID not set. Create a job first.")

        previous_stage = self.current_stage
        next_stage = self.pipeline_stages[current_index + 1]

        async with self.session_maker() as session, session.begin():
            try:
                serialized_checkpoint_data = _serialize_checkpoint_data(dto)
            except Exception as e:
                raise RuntimeError(f"Failed to serialize checkpoint data for job {self.job_id}: {e}") from e

            job_table = self._get_job_table()
            result = await session.execute(
                update_active_by_id(job_table, self.job_id)
                .where(job_table.current_stage == previous_stage)
                .values(
                    current_stage=next_stage,
                    checkpoint_data=serialized_checkpoint_data,
                )
            )

            rows_updated = result.rowcount

            if rows_updated == 0:
                await self._handle_zero_rows_updated(previous_stage, session)
                return

            self.current_stage = next_stage

        logger.info(
            "Stage transition",
            job_id=str(self.job_id),
            parent_type=self.parent_type,
            parent_id=str(self.parent_id),
            from_stage=previous_stage,
            to_stage=next_stage,
            stage_index=f"{current_index + 1}/{len(self.pipeline_stages)}",
            trace_id=self.trace_id,
        )

        await publish_rag_task(
            parent_type=self.parent_type,
            parent_id=self.parent_id,
            trace_id=self.trace_id,
        )

    async def update_job_status(
        self,
        status: RagGenerationStatusEnum,
        error_message: str | None = None,
        error_details: dict[str, Any] | None = None,
    ) -> None:
        if not self.job_id:
            raise RuntimeError("Job ID not set. Create a job first.")

        async with self.session_maker() as session:
            result = await session.execute(select_active(RagGenerationJob).where(RagGenerationJob.id == self.job_id))
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
        data: dict[str, Any] | None = None,
    ) -> None:
        if self.job_id is None:
            raise RuntimeError("Job ID not set. Create a job first.")

        current_pipeline_stage = self.pipeline_stages.index(self.current_stage)
        total_pipeline_stages = len(self.pipeline_stages)

        async with self.session_maker() as session:
            notification = GenerationNotification(
                rag_job_id=self.job_id,
                event=event,
                message=message,
                notification_type=notification_type,
                data=data,
                current_pipeline_stage=current_pipeline_stage,
                total_pipeline_stages=total_pipeline_stages,
            )
            session.add(notification)
            await session.commit()

        status_data: RagProcessingStatus = {
            "event": event,
            "message": message,
            "current_pipeline_stage": current_pipeline_stage,
            "total_pipeline_stages": total_pipeline_stages,
            "trace_id": self.trace_id,
        }

        if data is not None:
            status_data["data"] = data

        await publish_notification(
            parent_id=self.grant_application_id,
            event=event,
            data=status_data,
            trace_id=self.trace_id,
        )

    async def increment_retry_count(self) -> int:
        if self.job_id is None:
            raise RuntimeError("Job ID not set. Create a job first.")

        async with self.session_maker() as session:
            result = await session.execute(select_active(RagGenerationJob).where(RagGenerationJob.id == self.job_id))
            job = result.scalar_one()

            job.retry_count += 1
            await session.commit()
            return int(job.retry_count)

    async def get_job_notifications(self, limit: int | None = None) -> list[GenerationNotification]:
        if self.job_id is None:
            raise RuntimeError("Job ID not set. Create a job first.")

        async with self.session_maker() as session:
            query = (
                select_active(GenerationNotification)
                .where(GenerationNotification.rag_job_id == self.job_id)
                .order_by(GenerationNotification.created_at.desc())
            )

            if limit is not None:
                query = query.limit(limit)

            result = await session.execute(query)
            return list(result.scalars().all())

    async def ensure_not_cancelled(self) -> None:
        job_instance = self.job
        if job_instance is None:
            raise RuntimeError("Job not set. Create a job first.")

        async with self.session_maker() as session:
            refreshed_job = await session.get(type(job_instance), job_instance.id)
            if not refreshed_job:
                raise RuntimeError(f"Job {job_instance.id} not found")
            job_instance = cast("JobT", refreshed_job)

        self.job = job_instance

        if job_instance.status == RagGenerationStatusEnum.CANCELLED:
            await self.add_notification(
                event=NotificationEvents.CANCELLATION_ACKNOWLEDGED,
                message="Processing stopped due to cancellation",
                notification_type="warning",
            )
            raise RagJobCancelledError("Job cancelled")


class GrantTemplateJobManager[DTOType](
    BaseJobManager[GrantTemplateGenerationJob, GrantTemplateStageEnum, DTOType],
):
    parent_type: Literal["grant_template"] = "grant_template"

    async def get_or_create_job(self) -> GrantTemplateGenerationJob:
        logger.debug(
            "Getting or creating rag job job",
            template_id=str(self.parent_id),
            trace_id=self.trace_id,
        )

        async with self.session_maker() as session, session.begin():
            logger.debug(
                "Checking for existing job",
                template_id=str(self.parent_id),
                trace_id=self.trace_id,
            )
            try:
                existing_job_result = await session.execute(
                    select_active(GrantTemplateGenerationJob).where(
                        GrantTemplateGenerationJob.grant_template_id == self.parent_id
                    )
                )
                existing_job = cast("GrantTemplateGenerationJob | None", existing_job_result.scalar_one_or_none())

                if existing_job:
                    if existing_job.status == RagGenerationStatusEnum.FAILED:
                        logger.info(
                            "Found FAILED job for template, resetting to PROCESSING",
                            template_id=str(self.parent_id),
                            job_id=str(existing_job.id),
                            trace_id=self.trace_id,
                        )
                        existing_job.status = RagGenerationStatusEnum.PROCESSING
                        existing_job.error_message = None
                        existing_job.error_details = None
                        existing_job.failed_at = None
                        existing_job.retry_count = (existing_job.retry_count or 0) + 1
                        session.add(existing_job)
                        await session.flush()
                    else:
                        logger.info(
                            "Job already exists for template, returning existing job",
                            template_id=str(self.parent_id),
                            job_id=str(existing_job.id),
                            job_status=existing_job.status.value,
                            trace_id=self.trace_id,
                        )

                    self.job_id = existing_job.id
                    self.job = existing_job
                    return existing_job

                job = GrantTemplateGenerationJob(
                    grant_template_id=self.parent_id,
                    status=RagGenerationStatusEnum.PENDING,
                    current_stage=self.current_stage,
                    retry_count=0,
                )
                session.add(job)
                await session.flush()
                await session.commit()

                self.job_id = job.id
                self.job = job
                logger.info(
                    "Created new job for template",
                    template_id=str(self.parent_id),
                    job_id=str(job.id),
                    trace_id=self.trace_id,
                )

                return job
            except SQLAlchemyError as e:
                logger.error("Error inserting rag job into db", error=e, trace_id=self.trace_id)
                raise DatabaseError("Error inserting rag job into db") from e


class GrantApplicationJobManager[DTOType](
    BaseJobManager[GrantApplicationGenerationJob, GrantApplicationStageEnum, DTOType],
):
    parent_type: Literal["grant_application"] = "grant_application"

    async def get_or_create_job(self) -> GrantApplicationGenerationJob:
        logger.debug(
            "Getting or creating rag job job",
            application_id=str(self.parent_id),
            trace_id=self.trace_id,
        )

        async with self.session_maker() as session, session.begin():
            logger.debug(
                "Checking for existing job",
                application_id=str(self.parent_id),
                trace_id=self.trace_id,
            )
            try:
                existing_job_result = await session.execute(
                    select_active(GrantApplicationGenerationJob).where(
                        GrantApplicationGenerationJob.grant_application_id == self.parent_id
                    )
                )
                existing_job = cast("GrantApplicationGenerationJob | None", existing_job_result.scalar_one_or_none())

                if existing_job:
                    if existing_job.status == RagGenerationStatusEnum.FAILED:
                        logger.info(
                            "Found FAILED job for application, resetting to PROCESSING",
                            application_id=str(self.parent_id),
                            job_id=str(existing_job.id),
                            trace_id=self.trace_id,
                        )
                        existing_job.status = RagGenerationStatusEnum.PROCESSING
                        existing_job.error_message = None
                        existing_job.error_details = None
                        existing_job.failed_at = None
                        existing_job.retry_count = (existing_job.retry_count or 0) + 1
                        session.add(existing_job)
                        await session.flush()
                    else:
                        logger.info(
                            "Job already exists for application, returning existing job",
                            application_id=str(self.parent_id),
                            job_id=str(existing_job.id),
                            trace_id=self.trace_id,
                        )

                    self.job_id = existing_job.id
                    self.job = existing_job
                    return existing_job

                job = GrantApplicationGenerationJob(
                    grant_application_id=self.parent_id,
                    status=RagGenerationStatusEnum.PENDING,
                    current_stage=self.current_stage,
                    retry_count=0,
                )
                session.add(job)
                await session.flush()
                await session.commit()

                self.job_id = job.id
                self.job = job
                logger.info(
                    "Created new job for application",
                    application_id=str(self.parent_id),
                    job_id=str(job.id),
                    trace_id=self.trace_id,
                )

                return job
            except SQLAlchemyError as e:
                logger.error("Error inserting rag job into db", error=e, trace_id=self.trace_id)
                raise DatabaseError("Error inserting rag job into db") from e
