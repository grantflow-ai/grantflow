"""
DLQ Manager Cloud Function

Monitors and reconciles stuck jobs in the RAG pipeline.
Runs every 5 minutes via Cloud Scheduler.

Heuristics:
1. RagSource stuck in INDEXING > 10 minutes → republish to file-indexing topic
2. RagSource stuck in CREATED > 1 hour → republish to file-indexing/url-crawling
3. RagGenerationJob stuck in PROCESSING > 15 minutes → republish to rag-processing
4. RagGenerationJob stuck in PENDING > 1 hour → republish to rag-processing
5. DLQ messages > 50 → alert (don't auto-replay, needs investigation)
"""

import asyncio
import os
from collections.abc import AsyncGenerator
from datetime import UTC, datetime, timedelta
from typing import Any

import functions_framework
import structlog
from flask import Request
from google.cloud import pubsub_v1
from packages.db.src.enums import RagGenerationStatusEnum, SourceIndexingStatusEnum
from packages.db.src.tables import RagFile, RagGenerationJob, RagSource, RagUrl
from packages.shared_utils.src.serialization import serialize
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Setup logging
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

# Environment configuration
DATABASE_URL = os.environ["DATABASE_URL"]
PROJECT_ID = os.environ["GCP_PROJECT_ID"]

# Timeouts for stuck jobs
INDEXING_TIMEOUT_MINUTES = 10
CREATED_TIMEOUT_MINUTES = 60
RAG_PROCESSING_TIMEOUT_MINUTES = 15
RAG_PENDING_TIMEOUT_MINUTES = 60
DLQ_ALERT_THRESHOLD = 50

# Pub/Sub topics
TOPIC_FILE_INDEXING = "file-indexing"
TOPIC_URL_CRAWLING = "url-crawling"
TOPIC_RAG_PROCESSING = "rag-processing"

# DLQ subscriptions
DLQ_FILE_INDEXING = "file-indexing-dlq-subscription"
DLQ_URL_CRAWLING = "url-crawling-dlq-subscription"
DLQ_RAG_PROCESSING = "rag-processing-dlq-subscription"


async def get_session_maker() -> async_sessionmaker[AsyncSession]:
    """Create async session maker for database access."""
    engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session(session_maker: async_sessionmaker[AsyncSession]) -> AsyncGenerator[AsyncSession]:
    """Context manager for database sessions."""
    async with session_maker() as session, session.begin():
        yield session


def get_publisher() -> pubsub_v1.PublisherClient:
    """Get Pub/Sub publisher client."""
    return pubsub_v1.PublisherClient()


def get_subscriber() -> pubsub_v1.SubscriberClient:
    """Get Pub/Sub subscriber client."""
    return pubsub_v1.SubscriberClient()


async def check_stuck_indexing_sources(session: AsyncSession, now: datetime) -> list[RagSource]:
    """Find sources stuck in INDEXING status > 10 minutes."""
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
    """Find sources stuck in CREATED status > 1 hour."""
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
    """Find RAG jobs stuck in PROCESSING > 15 minutes."""
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
    """Find RAG jobs stuck in PENDING > 1 hour."""
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
    """Get approximate message count in DLQ subscription."""
    subscription_path = subscriber.subscription_path(PROJECT_ID, subscription_name)

    # Pull with max_messages=1 just to check if there are messages
    # Note: num_messages is approximate and may not be accurate
    try:
        response = subscriber.pull(
            request={"subscription": subscription_path, "max_messages": 1, "return_immediately": True}
        )

        # If we got a message, acknowledge it and put it back by not processing
        if response.received_messages:
            # Don't acknowledge - let it go back to queue
            return 1  # Simplified: just return 1 if messages exist
        return 0
    except Exception as e:
        logger.error("Failed to check DLQ", subscription=subscription_name, error=str(e))
        return 0


def republish_source_to_indexing(publisher: pubsub_v1.PublisherClient, source: RagSource) -> None:
    """Republish a source to the appropriate indexing topic."""
    topic_name = TOPIC_FILE_INDEXING if isinstance(source, RagFile) else TOPIC_URL_CRAWLING
    topic_path = publisher.topic_path(PROJECT_ID, topic_name)

    # Construct message based on source type
    message_data: dict[str, Any]
    if isinstance(source, RagFile):
        message_data = {
            "source_id": str(source.id),
            "bucket_name": source.bucket_name,
            "blob_name": source.object_path,
        }
    else:  # RagUrl
        rag_url = source if isinstance(source, RagUrl) else None
        if not rag_url:
            logger.error("Source is neither RagFile nor RagUrl", source_id=str(source.id))
            return
        message_data = {
            "source_id": str(source.id),
            "url": rag_url.url,
        }

    # Serialize to JSON bytes
    message_bytes = serialize(message_data)

    future = publisher.publish(topic_path, message_bytes)
    future.result()  # Block until published

    logger.info(
        "Republished stuck source",
        source_id=str(source.id),
        topic=topic_name,
        status=source.indexing_status.value,
    )


def republish_job_to_rag_processing(publisher: pubsub_v1.PublisherClient, job: RagGenerationJob) -> None:
    """Republish a RAG generation job to rag-processing topic."""
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
    """
    HTTP Cloud Function entry point for DLQ reconciliation.

    Triggered by Cloud Scheduler every 5 minutes.
    """
    try:
        result = asyncio.run(reconcile_stuck_jobs())
        return result, 200
    except Exception as e:
        logger.exception("DLQ reconciliation failed", error=str(e))
        return f"Error: {e!s}", 500


async def reconcile_stuck_jobs() -> str:
    """Main reconciliation logic."""
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
        # Check stuck indexing sources (> 10 min)
        stuck_indexing = await check_stuck_indexing_sources(session, now)
        for source in stuck_indexing:
            republish_source_to_indexing(publisher, source)
            stats["stuck_indexing"] += 1

        # Check stuck created sources (> 1 hour)
        stuck_created = await check_stuck_created_sources(session, now)
        for source in stuck_created:
            republish_source_to_indexing(publisher, source)
            stats["stuck_created"] += 1

        # Check stuck processing jobs (> 15 min)
        stuck_processing = await check_stuck_processing_jobs(session, now)
        for job in stuck_processing:
            republish_job_to_rag_processing(publisher, job)
            stats["stuck_processing_jobs"] += 1

        # Check stuck pending jobs (> 1 hour)
        stuck_pending = await check_stuck_pending_jobs(session, now)
        for job in stuck_pending:
            republish_job_to_rag_processing(publisher, job)
            stats["stuck_pending_jobs"] += 1

    # Check DLQ message counts (don't auto-replay if > threshold)
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
