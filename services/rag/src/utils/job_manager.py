from datetime import UTC, datetime
from typing import Any, Literal, cast
from uuid import UUID

from packages.db.src.enums import GrantApplicationStageEnum, GrantTemplateStageEnum, RagGenerationStatusEnum
from packages.db.src.query_helpers import select_active
from packages.db.src.tables import (
    GenerationNotification,
    RagGenerationJob,
)
from packages.shared_utils.src.exceptions import DatabaseError, RagJobCancelledError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_rag_task
from packages.shared_utils.src.serialization import to_builtins
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


def _serialize_checkpoint_data[DTOType](data: DTOType) -> dict[str, Any]:
    return cast("dict[str, Any]", to_builtins(data))


class JobManager[DTOType]:
    def __init__(
        self,
        *,
        entity_type: Literal["grant_template", "grant_application"],
        entity_id: UUID,
        grant_application_id: UUID,
        current_stage: GrantTemplateStageEnum | GrantApplicationStageEnum,
        pipeline_stages: list[GrantTemplateStageEnum | GrantApplicationStageEnum],
        session_maker: async_sessionmaker[Any],
        trace_id: str,
    ) -> None:
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.grant_application_id = grant_application_id
        self.current_stage = current_stage
        self.pipeline_stages = pipeline_stages
        self.session_maker = session_maker
        self.trace_id = trace_id
        self.current_job: RagGenerationJob | None = None

    async def get_or_create_job_for_stage(self) -> RagGenerationJob:
        logger.debug(
            "Getting or creating job for stage",
            entity_type=self.entity_type,
            entity_id=str(self.entity_id),
            stage=self.current_stage,
            trace_id=self.trace_id,
        )

        async with self.session_maker() as session, session.begin():
            try:
                if self.entity_type == "grant_template":
                    existing_job = await session.scalar(
                        select_active(RagGenerationJob).where(
                            RagGenerationJob.grant_template_id == self.entity_id,
                            RagGenerationJob.template_stage == self.current_stage,
                            RagGenerationJob.status.in_(
                                [
                                    RagGenerationStatusEnum.PENDING,
                                    RagGenerationStatusEnum.PROCESSING,
                                    RagGenerationStatusEnum.COMPLETED,
                                    RagGenerationStatusEnum.CANCELLED,
                                ]
                            ),
                        )
                    )
                else:
                    existing_job = await session.scalar(
                        select_active(RagGenerationJob).where(
                            RagGenerationJob.grant_application_id == self.entity_id,
                            RagGenerationJob.application_stage == self.current_stage,
                            RagGenerationJob.status.in_(
                                [
                                    RagGenerationStatusEnum.PENDING,
                                    RagGenerationStatusEnum.PROCESSING,
                                    RagGenerationStatusEnum.COMPLETED,
                                    RagGenerationStatusEnum.CANCELLED,
                                ]
                            ),
                        )
                    )

                if existing_job:
                    logger.info(
                        "Found existing job for stage",
                        entity_type=self.entity_type,
                        entity_id=str(self.entity_id),
                        job_id=str(existing_job.id),
                        stage=self.current_stage,
                        status=existing_job.status.value,
                        trace_id=self.trace_id,
                    )
                    self.current_job = existing_job

                    if existing_job.status == RagGenerationStatusEnum.CANCELLED:
                        raise RagJobCancelledError("Job cancelled")

                    return cast("RagGenerationJob", existing_job)

                parent_job_id = await self._get_parent_job_id(session)

                job_data = {
                    "status": RagGenerationStatusEnum.PENDING,
                    "retry_count": 0,
                    "parent_job_id": parent_job_id,
                }

                if self.entity_type == "grant_template":
                    job_data.update(
                        {
                            "grant_template_id": self.entity_id,
                            "template_stage": self.current_stage,
                        }
                    )
                else:
                    job_data.update(
                        {
                            "grant_application_id": self.entity_id,
                            "application_stage": self.current_stage,
                        }
                    )

                job = RagGenerationJob(**job_data)
                session.add(job)
                await session.flush()

                logger.info(
                    "Created new job for stage",
                    entity_type=self.entity_type,
                    entity_id=str(self.entity_id),
                    job_id=str(job.id),
                    stage=self.current_stage,
                    parent_job_id=str(parent_job_id) if parent_job_id else None,
                    trace_id=self.trace_id,
                )

                self.current_job = job
                return job

            except IntegrityError:
                logger.info(
                    "Job creation race condition detected, fetching existing job",
                    entity_type=self.entity_type,
                    entity_id=str(self.entity_id),
                    stage=self.current_stage,
                    trace_id=self.trace_id,
                )

        async with self.session_maker() as session:
            if self.entity_type == "grant_template":
                existing_job = await session.scalar(
                    select_active(RagGenerationJob).where(
                        RagGenerationJob.grant_template_id == self.entity_id,
                        RagGenerationJob.template_stage == self.current_stage,
                        RagGenerationJob.status.in_(
                            [
                                RagGenerationStatusEnum.PENDING,
                                RagGenerationStatusEnum.PROCESSING,
                                RagGenerationStatusEnum.COMPLETED,
                            ]
                        ),
                    )
                )
            else:
                existing_job = await session.scalar(
                    select_active(RagGenerationJob).where(
                        RagGenerationJob.grant_application_id == self.entity_id,
                        RagGenerationJob.application_stage == self.current_stage,
                        RagGenerationJob.status.in_(
                            [
                                RagGenerationStatusEnum.PENDING,
                                RagGenerationStatusEnum.PROCESSING,
                                RagGenerationStatusEnum.COMPLETED,
                            ]
                        ),
                    )
                )

            if not existing_job:
                raise RuntimeError("Could not find job after IntegrityError - another process may have deleted it")

            self.current_job = existing_job
            return cast("RagGenerationJob", existing_job)

    async def _get_parent_job_id(self, session: Any) -> UUID | None:
        current_index = self.pipeline_stages.index(self.current_stage)
        if current_index == 0:
            return None

        previous_stage = self.pipeline_stages[current_index - 1]

        if self.entity_type == "grant_template":
            parent_job = await session.scalar(
                select_active(RagGenerationJob)
                .where(
                    RagGenerationJob.grant_template_id == self.entity_id,
                    RagGenerationJob.template_stage == previous_stage,
                    RagGenerationJob.status == RagGenerationStatusEnum.COMPLETED,
                )
                .order_by(RagGenerationJob.created_at.desc())
            )
        else:
            parent_job = await session.scalar(
                select_active(RagGenerationJob)
                .where(
                    RagGenerationJob.grant_application_id == self.entity_id,
                    RagGenerationJob.application_stage == previous_stage,
                    RagGenerationJob.status == RagGenerationStatusEnum.COMPLETED,
                )
                .order_by(RagGenerationJob.created_at.desc())
            )

        return parent_job.id if parent_job else None

    async def transition_to_next_stage(self, dto: DTOType) -> None:
        if not self.current_job:
            raise RuntimeError("No current job set. Create a job first.")

        current_index = self.pipeline_stages.index(self.current_stage)
        if current_index >= len(self.pipeline_stages) - 1:
            logger.info(
                "Pipeline completed - no next stage",
                entity_type=self.entity_type,
                entity_id=str(self.entity_id),
                job_id=str(self.current_job.id),
                final_stage=self.current_stage,
                trace_id=self.trace_id,
            )
            return

        next_stage = self.pipeline_stages[current_index + 1]

        async with self.session_maker() as session, session.begin():
            job = await session.get(RagGenerationJob, self.current_job.id)
            if not job:
                raise RuntimeError(f"Job {self.current_job.id} not found")

            job.status = RagGenerationStatusEnum.COMPLETED
            job.completed_at = datetime.now(UTC)
            job.checkpoint_data = _serialize_checkpoint_data(dto)

            logger.info(
                "Stage completed",
                entity_type=self.entity_type,
                entity_id=str(self.entity_id),
                job_id=str(job.id),
                stage=self.current_stage,
                trace_id=self.trace_id,
            )

            await publish_rag_task(
                parent_type=self.entity_type,
                parent_id=self.entity_id,
                trace_id=self.trace_id,
            )

            self.current_stage = next_stage

            logger.info(
                "Published task for next stage",
                entity_type=self.entity_type,
                entity_id=str(self.entity_id),
                next_stage=next_stage,
                stage_index=f"{current_index + 2}/{len(self.pipeline_stages)}",
                trace_id=self.trace_id,
            )

    async def update_job_status(
        self,
        status: RagGenerationStatusEnum,
        error_message: str | None = None,
        error_details: dict[str, Any] | None = None,
    ) -> None:
        if not self.current_job:
            raise RuntimeError("No current job set. Create a job first.")

        async with self.session_maker() as session, session.begin():
            job = await session.get(RagGenerationJob, self.current_job.id)
            if not job:
                raise RuntimeError(f"Job {self.current_job.id} not found")

            job.status = status

            if status == RagGenerationStatusEnum.PROCESSING and job.started_at is None:
                job.started_at = datetime.now(UTC)
            elif status == RagGenerationStatusEnum.COMPLETED:
                job.completed_at = datetime.now(UTC)
            elif status == RagGenerationStatusEnum.FAILED:
                job.failed_at = datetime.now(UTC)
                job.error_message = error_message
                job.error_details = error_details

            logger.debug(
                "Job status updated",
                entity_type=self.entity_type,
                entity_id=str(self.entity_id),
                job_id=str(job.id),
                status=status.value,
                trace_id=self.trace_id,
            )

    async def add_notification(
        self,
        *,
        event: str,
        message: str,
        notification_type: Literal["info", "error", "warning", "success"] = "info",
        data: dict[str, Any] | None = None,
    ) -> None:
        if not self.current_job:
            raise RuntimeError("No current job set. Create a job first.")

        async with self.session_maker() as session, session.begin():
            notification = GenerationNotification(
                grant_application_id=self.grant_application_id,
                rag_job_id=self.current_job.id,
                event=event,
                message=message,
                notification_type=notification_type,
                data=data,
            )
            session.add(notification)

        logger.debug(
            "Notification added to database",
            entity_type=self.entity_type,
            entity_id=str(self.entity_id),
            notification_event=event,
            trace_id=self.trace_id,
        )

    async def increment_retry_count(self) -> int:
        if not self.current_job:
            raise RuntimeError("No current job set. Create a job first.")

        try:
            async with self.session_maker() as session, session.begin():
                job = await session.get(RagGenerationJob, self.current_job.id)
                if not job:
                    raise RuntimeError(f"Job {self.current_job.id} not found")

                job.retry_count += 1

                logger.debug(
                    "Job retry count incremented",
                    entity_type=self.entity_type,
                    entity_id=str(self.entity_id),
                    job_id=str(job.id),
                    retry_count=job.retry_count,
                    trace_id=self.trace_id,
                )

                return int(job.retry_count)
        except SQLAlchemyError as e:
            raise DatabaseError(
                f"Failed to increment retry count for job {self.current_job.id}",
                context={
                    "job_id": str(self.current_job.id),
                    "entity_type": self.entity_type,
                    "entity_id": str(self.entity_id),
                    "original_error": str(e),
                },
            ) from e

    async def get_job_notifications(self, limit: int | None = None) -> list[GenerationNotification]:
        if not self.current_job:
            raise RuntimeError("No current job set. Create a job first.")

        async with self.session_maker() as session:
            query = (
                select_active(GenerationNotification)
                .where(GenerationNotification.rag_job_id == self.current_job.id)
                .order_by(GenerationNotification.created_at.desc())
            )

            if limit is not None:
                query = query.limit(limit)

            result = await session.execute(query)
            return list(result.scalars().all())

    async def ensure_not_cancelled(self) -> None:
        if not self.current_job:
            raise RuntimeError("No current job set. Create a job first.")

        async with self.session_maker() as session:
            job = await session.get(RagGenerationJob, self.current_job.id)
            if not job:
                raise RuntimeError(f"Job {self.current_job.id} not found")

            if job.status == RagGenerationStatusEnum.CANCELLED:
                raise RagJobCancelledError("Job cancelled")

            self.current_job = job

    async def get_checkpoint_data(self) -> dict[str, Any] | None:
        if not self.current_job:
            return None

        if self.current_job.checkpoint_data is not None:
            return self.current_job.checkpoint_data

        if self.current_job.parent_job_id:
            async with self.session_maker() as session:
                parent_job = await session.get(RagGenerationJob, self.current_job.parent_job_id)
                if parent_job and parent_job.checkpoint_data is not None:
                    return parent_job.checkpoint_data  # type: ignore[no-any-return]

        return None
