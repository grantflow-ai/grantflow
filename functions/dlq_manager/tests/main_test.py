from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from google.cloud import pubsub_v1
from packages.db.src.enums import GrantApplicationStageEnum, RagGenerationStatusEnum, SourceIndexingStatusEnum
from packages.db.src.tables import GrantApplicationSource, RagFile, RagGenerationJob, RagSource, RagUrl
from packages.shared_utils.src.serialization import deserialize
from pytest_mock import MockerFixture
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker
from testing.factories import RagGenerationJobFactory


@pytest.fixture
def mock_publisher(mocker: MockerFixture) -> MagicMock:
    """Mock Pub/Sub publisher client."""
    mock = mocker.patch("functions.dlq_manager.main.get_publisher")
    publisher = MagicMock(spec=pubsub_v1.PublisherClient)
    future = MagicMock()
    future.result.return_value = None
    publisher.publish.return_value = future
    publisher.topic_path.return_value = "projects/test/topics/test-topic"
    mock.return_value = publisher
    return publisher


@pytest.fixture
def mock_subscriber(mocker: MockerFixture) -> MagicMock:
    """Mock Pub/Sub subscriber client."""
    mock = mocker.patch("functions.dlq_manager.main.get_subscriber")
    subscriber = MagicMock(spec=pubsub_v1.SubscriberClient)
    subscriber.subscription_path.return_value = "projects/test/subscriptions/test-subscription"
    subscriber.pull.return_value = MagicMock(received_messages=[])
    mock.return_value = subscriber
    return subscriber


@pytest.fixture
def now() -> datetime:
    """Current timestamp for testing."""
    return datetime.now(UTC)


# Stuck Indexing Sources Tests


async def test_check_stuck_indexing_sources_finds_stuck_sources(
    async_session_maker: async_sessionmaker[Any],
    now: datetime,
) -> None:
    """Test that stuck indexing sources are correctly identified."""
    from functions.dlq_manager.main import INDEXING_TIMEOUT_MINUTES, check_stuck_indexing_sources

    stuck_time = now - timedelta(minutes=INDEXING_TIMEOUT_MINUTES + 5)
    recent_time = now - timedelta(minutes=INDEXING_TIMEOUT_MINUTES - 1)

    async with async_session_maker() as session, session.begin():
        # Create a stuck source
        stuck_source_id = await session.scalar(
            insert(RagSource)
            .values(
                {
                    "indexing_status": SourceIndexingStatusEnum.INDEXING,
                    "indexing_started_at": stuck_time,
                    "text_content": "",
                    "source_type": "rag_file",
                    "deleted_at": None,
                    "parent_id": None,
                }
            )
            .returning(RagSource.id)
        )

        # Create a recent indexing source (should not be stuck)
        await session.execute(
            insert(RagSource).values(
                {
                    "indexing_status": SourceIndexingStatusEnum.INDEXING,
                    "indexing_started_at": recent_time,
                    "text_content": "",
                    "source_type": "rag_file",
                    "deleted_at": None,
                    "parent_id": None,
                }
            )
        )

        # Create a finished source (should not be stuck)
        await session.execute(
            insert(RagSource).values(
                {
                    "indexing_status": SourceIndexingStatusEnum.FINISHED,
                    "indexing_started_at": stuck_time,
                    "text_content": "content",
                    "source_type": "rag_file",
                    "deleted_at": None,
                    "parent_id": None,
                }
            )
        )

        await session.commit()

    async with async_session_maker() as session, session.begin():
        stuck_sources = await check_stuck_indexing_sources(session, now)

    assert len(stuck_sources) == 1
    assert stuck_sources[0].id == stuck_source_id
    assert stuck_sources[0].indexing_status == SourceIndexingStatusEnum.INDEXING


async def test_check_stuck_indexing_sources_excludes_deleted(
    async_session_maker: async_sessionmaker[Any],
    now: datetime,
) -> None:
    """Test that deleted sources are excluded from stuck indexing check."""
    from functions.dlq_manager.main import INDEXING_TIMEOUT_MINUTES, check_stuck_indexing_sources

    stuck_time = now - timedelta(minutes=INDEXING_TIMEOUT_MINUTES + 5)

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagSource).values(
                {
                    "indexing_status": SourceIndexingStatusEnum.INDEXING,
                    "indexing_started_at": stuck_time,
                    "text_content": "",
                    "source_type": "rag_file",
                    "deleted_at": now,
                    "parent_id": None,
                }
            )
        )
        await session.commit()

    async with async_session_maker() as session, session.begin():
        stuck_sources = await check_stuck_indexing_sources(session, now)

    assert len(stuck_sources) == 0


# Stuck Created Sources Tests


async def test_check_stuck_created_sources_finds_stuck_sources(
    async_session_maker: async_sessionmaker[Any],
    now: datetime,
) -> None:
    """Test that stuck created sources are correctly identified."""
    from functions.dlq_manager.main import CREATED_TIMEOUT_MINUTES, check_stuck_created_sources

    stuck_time = now - timedelta(minutes=CREATED_TIMEOUT_MINUTES + 5)
    recent_time = now - timedelta(minutes=CREATED_TIMEOUT_MINUTES - 1)

    async with async_session_maker() as session, session.begin():
        # Create a stuck CREATED source
        stuck_source_id = await session.scalar(
            insert(RagSource)
            .values(
                {
                    "indexing_status": SourceIndexingStatusEnum.CREATED,
                    "created_at": stuck_time,
                    "text_content": "",
                    "source_type": "rag_file",
                    "deleted_at": None,
                    "parent_id": None,
                }
            )
            .returning(RagSource.id)
        )

        # Create a recent CREATED source (should not be stuck)
        await session.execute(
            insert(RagSource).values(
                {
                    "indexing_status": SourceIndexingStatusEnum.CREATED,
                    "created_at": recent_time,
                    "text_content": "",
                    "source_type": "rag_file",
                    "deleted_at": None,
                    "parent_id": None,
                }
            )
        )

        await session.commit()

    async with async_session_maker() as session, session.begin():
        stuck_sources = await check_stuck_created_sources(session, now)

    assert len(stuck_sources) == 1
    assert stuck_sources[0].id == stuck_source_id
    assert stuck_sources[0].indexing_status == SourceIndexingStatusEnum.CREATED


# Stuck Processing Jobs Tests


async def test_check_stuck_processing_jobs_finds_stuck_jobs(
    async_session_maker: async_sessionmaker[Any],
    grant_application: Any,
    now: datetime,
) -> None:
    """Test that stuck processing jobs are correctly identified."""
    from functions.dlq_manager.main import RAG_PROCESSING_TIMEOUT_MINUTES, check_stuck_processing_jobs

    stuck_time = now - timedelta(minutes=RAG_PROCESSING_TIMEOUT_MINUTES + 5)
    recent_time = now - timedelta(minutes=RAG_PROCESSING_TIMEOUT_MINUTES - 1)

    grant_application_id = grant_application.id

    async with async_session_maker() as session, session.begin():
        # Create a stuck PROCESSING job - use raw SQL INSERT to set timestamp directly
        stuck_job_id = await session.scalar(
            insert(RagGenerationJob)
            .values(
                grant_application_id=grant_application_id,
                grant_template_id=None,
                application_stage=GrantApplicationStageEnum.BLUEPRINT_PREP,
                template_stage=None,
                status=RagGenerationStatusEnum.PROCESSING,
                started_at=stuck_time,
                retry_count=0,
                deleted_at=None,
                parent_job_id=None,
                checkpoint_data=None,
            )
            .returning(RagGenerationJob.id)
        )

        # Create a recent PROCESSING job (should not be stuck)
        await session.execute(
            insert(RagGenerationJob).values(
                grant_application_id=grant_application_id,
                grant_template_id=None,
                application_stage=GrantApplicationStageEnum.WORKPLAN_GENERATION,
                template_stage=None,
                status=RagGenerationStatusEnum.PROCESSING,
                started_at=recent_time,
                retry_count=0,
                deleted_at=None,
                parent_job_id=None,
                checkpoint_data=None,
            )
        )

        # Create a completed job (should not be stuck)
        await session.execute(
            insert(RagGenerationJob).values(
                grant_application_id=grant_application_id,
                grant_template_id=None,
                application_stage=GrantApplicationStageEnum.SECTION_SYNTHESIS,
                template_stage=None,
                status=RagGenerationStatusEnum.COMPLETED,
                started_at=stuck_time,
                completed_at=now,
                retry_count=0,
                deleted_at=None,
                parent_job_id=None,
                checkpoint_data=None,
            )
        )

        await session.commit()

    async with async_session_maker() as session, session.begin():
        stuck_jobs = await check_stuck_processing_jobs(session, now)

    assert len(stuck_jobs) == 1
    assert stuck_jobs[0].id == stuck_job_id
    assert stuck_jobs[0].status == RagGenerationStatusEnum.PROCESSING


async def test_check_stuck_processing_jobs_excludes_deleted(
    async_session_maker: async_sessionmaker[Any],
    grant_application: Any,
    now: datetime,
) -> None:
    """Test that deleted jobs are excluded from stuck processing check."""
    from functions.dlq_manager.main import RAG_PROCESSING_TIMEOUT_MINUTES, check_stuck_processing_jobs

    stuck_time = now - timedelta(minutes=RAG_PROCESSING_TIMEOUT_MINUTES + 5)

    async with async_session_maker() as session, session.begin():
        deleted_job = RagGenerationJobFactory.build(
            grant_application_id=grant_application.id,
            grant_template_id=None,
            application_stage=GrantApplicationStageEnum.BLUEPRINT_PREP,
            template_stage=None,
            status=RagGenerationStatusEnum.PROCESSING,
            started_at=stuck_time,
            deleted_at=now,
        )
        session.add(deleted_job)
        await session.commit()

    async with async_session_maker() as session, session.begin():
        stuck_jobs = await check_stuck_processing_jobs(session, now)

    assert len(stuck_jobs) == 0


# Stuck Pending Jobs Tests


async def test_check_stuck_pending_jobs_finds_stuck_jobs(
    async_session_maker: async_sessionmaker[Any],
    grant_application: Any,
    now: datetime,
) -> None:
    """Test that stuck pending jobs are correctly identified."""
    from functions.dlq_manager.main import RAG_PENDING_TIMEOUT_MINUTES, check_stuck_pending_jobs

    stuck_time = now - timedelta(minutes=RAG_PENDING_TIMEOUT_MINUTES + 5)
    recent_time = now - timedelta(minutes=RAG_PENDING_TIMEOUT_MINUTES - 1)

    grant_application_id = grant_application.id

    async with async_session_maker() as session, session.begin():
        # Create a stuck PENDING job - use raw SQL INSERT to set timestamp directly
        stuck_job_id = await session.scalar(
            insert(RagGenerationJob)
            .values(
                grant_application_id=grant_application_id,
                grant_template_id=None,
                application_stage=GrantApplicationStageEnum.BLUEPRINT_PREP,
                template_stage=None,
                status=RagGenerationStatusEnum.PENDING,
                created_at=stuck_time,
                retry_count=0,
                deleted_at=None,
                parent_job_id=None,
                checkpoint_data=None,
            )
            .returning(RagGenerationJob.id)
        )

        # Create a recent PENDING job (should not be stuck)
        await session.execute(
            insert(RagGenerationJob).values(
                grant_application_id=grant_application_id,
                grant_template_id=None,
                application_stage=GrantApplicationStageEnum.WORKPLAN_GENERATION,
                template_stage=None,
                status=RagGenerationStatusEnum.PENDING,
                created_at=recent_time,
                retry_count=0,
                deleted_at=None,
                parent_job_id=None,
                checkpoint_data=None,
            )
        )

        await session.commit()

    async with async_session_maker() as session, session.begin():
        stuck_jobs = await check_stuck_pending_jobs(session, now)

    assert len(stuck_jobs) == 1
    assert stuck_jobs[0].id == stuck_job_id
    assert stuck_jobs[0].status == RagGenerationStatusEnum.PENDING


# Republishing Tests


async def test_republish_source_to_indexing_rag_file(
    mock_publisher: MagicMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    """Test republishing a RagFile to file-indexing topic."""
    from functions.dlq_manager.main import republish_source_to_indexing

    source_id = uuid4()
    source = RagFile(
        id=source_id,
        bucket_name="test-bucket",
        object_path="test/path/file.pdf",
        filename="file.pdf",
        mime_type="application/pdf",
        size=1024,
        indexing_status=SourceIndexingStatusEnum.INDEXING,
        text_content="",
        source_type="rag_file",
        deleted_at=None,
        parent_id=None,
    )

    await republish_source_to_indexing(mock_publisher, async_session_maker, source)

    mock_publisher.publish.assert_called_once()
    call_args, call_kwargs = mock_publisher.publish.call_args
    assert call_args[0] == "projects/test/topics/test-topic"  # topic path
    assert call_args[1] == b""  # empty message body
    # Verify GCS-style attributes are used
    assert call_kwargs["bucketId"] == "test-bucket"
    assert call_kwargs["objectId"] == "test/path/file.pdf"
    assert call_kwargs["eventType"] == "OBJECT_FINALIZE"


async def test_republish_source_to_indexing_rag_url(
    mock_publisher: MagicMock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: Any,
) -> None:
    """Test republishing a RagUrl to url-crawling topic."""
    from functions.dlq_manager.main import republish_source_to_indexing

    source_id = uuid4()
    source = RagUrl(
        id=source_id,
        url="https://example.com/page",
        indexing_status=SourceIndexingStatusEnum.INDEXING,
        text_content="",
        source_type="rag_url",
        deleted_at=None,
        parent_id=None,
    )

    # Create source and link to grant application
    async with async_session_maker() as session, session.begin():
        session.add(source)
        await session.flush()

        # Link source to grant application
        link = GrantApplicationSource(
            rag_source_id=source_id,
            grant_application_id=grant_application.id,
        )
        session.add(link)
        await session.commit()

    await republish_source_to_indexing(mock_publisher, async_session_maker, source)

    mock_publisher.publish.assert_called_once()
    call_args, _call_kwargs = mock_publisher.publish.call_args
    assert call_args[0] == "projects/test/topics/test-topic"

    # Verify CrawlingRequest format with serialized body
    message_bytes = call_args[1]
    assert isinstance(message_bytes, bytes)
    message_data = deserialize(message_bytes, target_type=dict[str, Any])
    assert message_data["source_id"] == str(source_id)
    assert message_data["url"] == "https://example.com/page"
    assert message_data["entity_type"] == "grant_application"
    assert message_data["entity_id"] == str(grant_application.id)
    assert "trace_id" in message_data


def test_republish_job_to_rag_processing(
    mock_publisher: MagicMock,
) -> None:
    """Test republishing a RAG job to rag-processing topic."""
    from functions.dlq_manager.main import republish_job_to_rag_processing

    job_id = uuid4()
    grant_application_id = uuid4()
    job = RagGenerationJob(
        id=job_id,
        grant_application_id=grant_application_id,
        grant_template_id=None,
        status=RagGenerationStatusEnum.PROCESSING,
        retry_count=1,
        deleted_at=None,
        parent_job_id=None,
        checkpoint_data=None,
    )

    republish_job_to_rag_processing(mock_publisher, job)

    mock_publisher.publish.assert_called_once()
    call_args = mock_publisher.publish.call_args
    assert call_args[0][0] == "projects/test/topics/test-topic"


# DLQ Monitoring Tests


def test_check_dlq_message_count_no_messages(
    mock_subscriber: MagicMock,
) -> None:
    """Test DLQ check when no messages exist."""
    from functions.dlq_manager.main import check_dlq_message_count

    mock_subscriber.pull.return_value = MagicMock(received_messages=[])

    count = check_dlq_message_count(mock_subscriber, "test-subscription")

    assert count == 0
    mock_subscriber.pull.assert_called_once()


def test_check_dlq_message_count_has_messages(
    mock_subscriber: MagicMock,
) -> None:
    """Test DLQ check when messages exist."""
    from functions.dlq_manager.main import check_dlq_message_count

    mock_subscriber.pull.return_value = MagicMock(received_messages=[MagicMock()])

    count = check_dlq_message_count(mock_subscriber, "test-subscription")

    assert count == 1
    mock_subscriber.pull.assert_called_once()


def test_check_dlq_message_count_handles_error(
    mock_subscriber: MagicMock,
) -> None:
    """Test DLQ check handles errors gracefully."""
    from functions.dlq_manager.main import check_dlq_message_count

    mock_subscriber.pull.side_effect = Exception("API error")

    count = check_dlq_message_count(mock_subscriber, "test-subscription")

    assert count == 0


# Integration Tests


async def test_reconcile_stuck_jobs_full_flow(
    async_session_maker: async_sessionmaker[Any],
    grant_application: Any,
    mock_publisher: MagicMock,
    mock_subscriber: MagicMock,
    mocker: MockerFixture,
    now: datetime,
) -> None:
    """Integration test for full reconciliation flow."""
    from functions.dlq_manager.main import (
        CREATED_TIMEOUT_MINUTES,
        INDEXING_TIMEOUT_MINUTES,
        RAG_PENDING_TIMEOUT_MINUTES,
        RAG_PROCESSING_TIMEOUT_MINUTES,
        reconcile_stuck_jobs,
    )

    grant_application_id = grant_application.id

    # Create test data
    async with async_session_maker() as session, session.begin():
        # Stuck indexing source - create proper RagFile
        stuck_file = RagFile(
            indexing_status=SourceIndexingStatusEnum.INDEXING,
            indexing_started_at=now - timedelta(minutes=INDEXING_TIMEOUT_MINUTES + 5),
            text_content="",
            source_type="rag_file",
            deleted_at=None,
            parent_id=None,
            bucket_name="test-bucket",
            object_path="test/file.pdf",
            filename="file.pdf",
            mime_type="application/pdf",
            size=1024,
        )
        session.add(stuck_file)

        # Stuck created source - create proper RagUrl with entity association
        stuck_url = RagUrl(
            indexing_status=SourceIndexingStatusEnum.CREATED,
            created_at=now - timedelta(minutes=CREATED_TIMEOUT_MINUTES + 5),
            text_content="",
            source_type="rag_url",
            deleted_at=None,
            parent_id=None,
            url="https://example.com/page",
        )
        session.add(stuck_url)
        await session.flush()

        # Link stuck_url to grant_application
        url_link = GrantApplicationSource(
            rag_source_id=stuck_url.id,
            grant_application_id=grant_application_id,
        )
        session.add(url_link)

        # Stuck processing job - use raw SQL INSERT
        await session.execute(
            insert(RagGenerationJob).values(
                grant_application_id=grant_application_id,
                grant_template_id=None,
                application_stage=GrantApplicationStageEnum.BLUEPRINT_PREP,
                template_stage=None,
                status=RagGenerationStatusEnum.PROCESSING,
                started_at=now - timedelta(minutes=RAG_PROCESSING_TIMEOUT_MINUTES + 5),
                retry_count=0,
                deleted_at=None,
                parent_job_id=None,
                checkpoint_data=None,
            )
        )

        # Stuck pending job - use raw SQL INSERT
        await session.execute(
            insert(RagGenerationJob).values(
                grant_application_id=grant_application_id,
                grant_template_id=None,
                application_stage=GrantApplicationStageEnum.WORKPLAN_GENERATION,
                template_stage=None,
                status=RagGenerationStatusEnum.PENDING,
                created_at=now - timedelta(minutes=RAG_PENDING_TIMEOUT_MINUTES + 5),
                retry_count=0,
                deleted_at=None,
                parent_job_id=None,
                checkpoint_data=None,
            )
        )

        await session.commit()

    # Mock get_session_maker to return our test session maker
    async def mock_get_session_maker() -> async_sessionmaker[Any]:
        return async_session_maker

    mocker.patch("functions.dlq_manager.main.get_session_maker", side_effect=mock_get_session_maker)

    # Mock time to return our test timestamp
    mock_datetime = mocker.patch("functions.dlq_manager.main.datetime")
    mock_datetime.now.return_value = now

    result = await reconcile_stuck_jobs()

    # Verify republishing happened
    assert mock_publisher.publish.call_count == 4  # 2 sources + 2 jobs
    assert "stuck_indexing" in result
    assert "stuck_created" in result
    assert "stuck_processing_jobs" in result
    assert "stuck_pending_jobs" in result


async def test_reconcile_stuck_jobs_no_stuck_items(
    async_session_maker: async_sessionmaker[Any],
    mock_publisher: MagicMock,
    mock_subscriber: MagicMock,
    mocker: MockerFixture,
) -> None:
    """Test reconciliation when no items are stuck."""
    from functions.dlq_manager.main import reconcile_stuck_jobs

    # Mock get_session_maker to return our test session maker
    async def mock_get_session_maker() -> async_sessionmaker[Any]:
        return async_session_maker

    mocker.patch("functions.dlq_manager.main.get_session_maker", side_effect=mock_get_session_maker)

    result = await reconcile_stuck_jobs()

    assert "'stuck_indexing': 0" in result
    assert "'stuck_created': 0" in result
    assert "'stuck_processing_jobs': 0" in result
    assert "'stuck_pending_jobs': 0" in result
    mock_publisher.publish.assert_not_called()


# HTTP Handler Tests


def test_handle_dlq_reconciliation_success(
    mocker: MockerFixture,
) -> None:
    """Test successful HTTP handler invocation."""
    from functions.dlq_manager.main import handle_dlq_reconciliation

    mock_reconcile = mocker.patch("functions.dlq_manager.main.reconcile_stuck_jobs")
    mock_reconcile.return_value = "Reconciliation completed: {'stuck_indexing': 0}"

    mock_request = MagicMock()
    result, status_code = handle_dlq_reconciliation(mock_request)

    assert status_code == 200
    assert "Reconciliation completed" in result
    mock_reconcile.assert_called_once()


def test_handle_dlq_reconciliation_error(
    mocker: MockerFixture,
) -> None:
    """Test HTTP handler error handling."""
    from functions.dlq_manager.main import handle_dlq_reconciliation

    mock_reconcile = mocker.patch("functions.dlq_manager.main.reconcile_stuck_jobs")
    mock_reconcile.side_effect = Exception("Database error")

    mock_request = MagicMock()
    result, status_code = handle_dlq_reconciliation(mock_request)

    assert status_code == 500
    assert "Error" in result
