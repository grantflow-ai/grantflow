import asyncio
import os
import sys
from collections.abc import AsyncGenerator
from datetime import UTC, datetime, timedelta
from pathlib import Path

import functions_framework
import structlog
from flask import Request
from google.cloud import pubsub_v1

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR / "packages"))
sys.path.insert(0, str(CURRENT_DIR))

# ruff: noqa: E402
from packages.db.src.enums import RagGenerationStatusEnum, SourceIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplicationSource,
    GrantingInstitutionSource,
    GrantTemplateSource,
    RagFile,
    RagGenerationJob,
    RagSource,
    RagUrl,
)
from packages.shared_utils.src.serialization import serialize
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import with_polymorphic

structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)
logger = structlog.get_logger(__name__)

DATABASE_URL = os.environ["DATABASE_URL"]
PROJECT_ID = os.environ["GCP_PROJECT_ID"]

INDEXING_TIMEOUT_MINUTES = 10
CREATED_TIMEOUT_MINUTES = 60
RAG_PROCESSING_TIMEOUT_MINUTES = 15
RAG_PENDING_TIMEOUT_MINUTES = 60
DLQ_ALERT_THRESHOLD = 50

TOPIC_FILE_INDEXING = "file-indexing"
TOPIC_URL_CRAWLING = "url-crawling"
TOPIC_RAG_PROCESSING = "rag-processing"

DLQ_FILE_INDEXING = "file-indexing-dlq-subscription"
DLQ_URL_CRAWLING = "url-crawling-dlq-subscription"
DLQ_RAG_PROCESSING = "rag-processing-dlq-subscription"


async def get_session_maker() -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session(session_maker: async_sessionmaker[AsyncSession]) -> AsyncGenerator[AsyncSession]:
    async with session_maker() as session, session.begin():
        yield session


def get_publisher() -> pubsub_v1.PublisherClient:
    return pubsub_v1.PublisherClient()


def get_subscriber() -> pubsub_v1.SubscriberClient:
    return pubsub_v1.SubscriberClient()


async def check_stuck_indexing_sources(session: AsyncSession, now: datetime) -> list[RagSource]:
    timeout = now - timedelta(minutes=INDEXING_TIMEOUT_MINUTES)

    result = await session.execute(
        select(RagSource).where(
            RagSource.indexing_status == SourceIndexingStatusEnum.INDEXING,
            RagSource.indexing_started_at < timeout,
            RagSource.deleted_at.is_(None),
        )
    )
    return list(result.scalars().all())


async def check_stuck_created_sources(session: AsyncSession, now: datetime) -> list[RagSource]:
    timeout = now - timedelta(minutes=CREATED_TIMEOUT_MINUTES)

    result = await session.execute(
        select(RagSource).where(
            RagSource.indexing_status == SourceIndexingStatusEnum.CREATED,
            RagSource.created_at < timeout,
            RagSource.deleted_at.is_(None),
        )
    )
    return list(result.scalars().all())


async def check_stuck_processing_jobs(session: AsyncSession, now: datetime) -> list[RagGenerationJob]:
    timeout = now - timedelta(minutes=RAG_PROCESSING_TIMEOUT_MINUTES)

    result = await session.execute(
        select(RagGenerationJob).where(
            RagGenerationJob.status == RagGenerationStatusEnum.PROCESSING,
            RagGenerationJob.started_at < timeout,
            RagGenerationJob.deleted_at.is_(None),
        )
    )
    return list(result.scalars().all())


async def check_stuck_pending_jobs(session: AsyncSession, now: datetime) -> list[RagGenerationJob]:
    timeout = now - timedelta(minutes=RAG_PENDING_TIMEOUT_MINUTES)

    result = await session.execute(
        select(RagGenerationJob).where(
            RagGenerationJob.status == RagGenerationStatusEnum.PENDING,
            RagGenerationJob.created_at < timeout,
            RagGenerationJob.deleted_at.is_(None),
        )
    )
    return list(result.scalars().all())


def check_dlq_message_count(subscriber: pubsub_v1.SubscriberClient, subscription_name: str) -> int:
    subscription_path = subscriber.subscription_path(PROJECT_ID, subscription_name)

    try:
        response = subscriber.pull(
            request={"subscription": subscription_path, "max_messages": 1, "return_immediately": True}
        )

        if response.received_messages:
            return 1
        return 0
    except Exception as e:
        logger.error("Failed to check DLQ", subscription=subscription_name, error=str(e))
        return 0


async def republish_source_to_indexing(
    publisher: pubsub_v1.PublisherClient, session_maker: async_sessionmaker[AsyncSession], source: RagSource
) -> None:
    if isinstance(source, RagFile):
        topic_name = TOPIC_FILE_INDEXING
        topic_path = publisher.topic_path(PROJECT_ID, topic_name)

        attributes = {
            "bucketId": source.bucket_name,
            "objectId": source.object_path,
            "eventType": "OBJECT_FINALIZE",
        }

        future = publisher.publish(topic_path, b"", **attributes)
        future.result()

        logger.info(
            "Republished stuck file source",
            source_id=str(source.id),
            bucket=source.bucket_name,
            object_path=source.object_path,
            topic=topic_name,
        )

    elif isinstance(source, RagUrl):
        async with session_maker() as session:
            if app_id := await session.scalar(
                select(GrantApplicationSource.grant_application_id).where(
                    GrantApplicationSource.rag_source_id == source.id
                )
            ):
                entity_type = "grant_application"
                entity_id = str(app_id)
            elif template_id := await session.scalar(
                select(GrantTemplateSource.grant_template_id).where(GrantTemplateSource.rag_source_id == source.id)
            ):
                entity_type = "grant_template"
                entity_id = str(template_id)
            elif institution_id := await session.scalar(
                select(GrantingInstitutionSource.granting_institution_id).where(
                    GrantingInstitutionSource.rag_source_id == source.id
                )
            ):
                entity_type = "granting_institution"
                entity_id = str(institution_id)
            else:
                logger.error(
                    "No entity found for RagUrl source",
                    source_id=str(source.id),
                    url=source.url,
                )
                return

        topic_name = TOPIC_URL_CRAWLING
        topic_path = publisher.topic_path(PROJECT_ID, topic_name)

        message_data = {
            "source_id": str(source.id),
            "url": source.url,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "trace_id": "",
        }

        message_bytes = serialize(message_data)
        future = publisher.publish(topic_path, message_bytes)
        future.result()

        logger.info(
            "Republished stuck URL source",
            source_id=str(source.id),
            url=source.url,
            entity_type=entity_type,
            entity_id=entity_id,
            topic=topic_name,
        )
    else:
        logger.error("Unknown source type", source_id=str(source.id), source_type=type(source).__name__)


def republish_job_to_rag_processing(publisher: pubsub_v1.PublisherClient, job: RagGenerationJob) -> None:
    topic_path = publisher.topic_path(PROJECT_ID, TOPIC_RAG_PROCESSING)

    message_data = {
        "job_id": str(job.id),
        "grant_application_id": str(job.grant_application_id) if job.grant_application_id else None,
        "grant_template_id": str(job.grant_template_id) if job.grant_template_id else None,
    }

    message_bytes = serialize(message_data)

    future = publisher.publish(topic_path, message_bytes)
    future.result()

    logger.info(
        "Republished stuck RAG job",
        job_id=str(job.id),
        status=job.status.value,
        retry_count=job.retry_count,
    )


@functions_framework.http
def handle_dlq_reconciliation(_request: Request) -> tuple[str, int]:
    try:
        result = asyncio.run(reconcile_stuck_jobs())
        return result, 200
    except Exception as e:
        logger.exception("DLQ reconciliation failed", error=str(e))
        return f"Error: {e!s}", 500


async def reconcile_stuck_jobs() -> str:
    now = datetime.now(UTC)
    session_maker = await get_session_maker()
    publisher = get_publisher()
    subscriber = get_subscriber()

    stats = {
        "stuck_indexing": 0,
        "stuck_created": 0,
        "stuck_processing_jobs": 0,
        "stuck_pending_jobs": 0,
        "dlq_alerts": 0,
    }

    async with session_maker() as session, session.begin():
        stuck_indexing_ids = [s.id for s in await check_stuck_indexing_sources(session, now)]
        stuck_created_ids = [s.id for s in await check_stuck_created_sources(session, now)]
        stuck_processing_ids = [j.id for j in await check_stuck_processing_jobs(session, now)]
        stuck_pending_ids = [j.id for j in await check_stuck_pending_jobs(session, now)]

    poly_source = with_polymorphic(RagSource, "*")
    for source_id in stuck_indexing_ids:
        async with session_maker() as session:
            result = await session.execute(select(poly_source).where(poly_source.id == source_id))
            if source := result.scalar_one_or_none():
                await republish_source_to_indexing(publisher, session_maker, source)
                stats["stuck_indexing"] += 1

    for source_id in stuck_created_ids:
        async with session_maker() as session:
            result = await session.execute(select(poly_source).where(poly_source.id == source_id))
            if source := result.scalar_one_or_none():
                await republish_source_to_indexing(publisher, session_maker, source)
                stats["stuck_created"] += 1

    for job_id in stuck_processing_ids:
        async with session_maker() as session:
            if job := await session.get(RagGenerationJob, job_id):
                republish_job_to_rag_processing(publisher, job)
                stats["stuck_processing_jobs"] += 1

    for job_id in stuck_pending_ids:
        async with session_maker() as session:
            if job := await session.get(RagGenerationJob, job_id):
                republish_job_to_rag_processing(publisher, job)
                stats["stuck_pending_jobs"] += 1

    for dlq_sub in [DLQ_FILE_INDEXING, DLQ_URL_CRAWLING, DLQ_RAG_PROCESSING]:
        count = check_dlq_message_count(subscriber, dlq_sub)
        if count > 0:
            logger.warning(
                "DLQ has messages - needs investigation",
                subscription=dlq_sub,
                approximate_count=count,
            )
            stats["dlq_alerts"] += 1

    logger.info("DLQ reconciliation completed", **stats)

    return f"Reconciliation completed: {stats}"
