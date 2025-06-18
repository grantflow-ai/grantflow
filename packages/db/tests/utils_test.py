from typing import Any
from unittest.mock import AsyncMock, Mock, patch
from uuid import UUID, uuid4

import pytest
from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker
from structlog import BoundLogger

from packages.db.src.constants import RAG_FILE
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    FundingOrganization,
    FundingOrganizationRagSource,
    GrantApplication,
    GrantApplicationRagSource,
    RagFile,
    RagSource,
)
from packages.db.src.utils import check_exists_files_being_indexed, update_source_indexing_status
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.exceptions import ValidationError


async def test_check_exists_files_being_indexed_application_success(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationRagSource,
) -> None:
    file_id: UUID = uuid4()
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagSource).values(
                {
                    "id": file_id,
                    "source_type": RAG_FILE,
                    "indexing_status": SourceIndexingStatusEnum.INDEXING,
                }
            )
        )

        await session.execute(
            insert(RagFile).values(
                {
                    "id": file_id,
                    "filename": "test.txt",
                    "mime_type": "text/plain",
                    "size": 100,
                    "bucket_name": "test-bucket",
                    "object_path": "test-file-path",
                }
            )
        )
        await session.execute(
            insert(GrantApplicationRagSource).values(
                {
                    "grant_application_id": grant_application.id,
                    "rag_source_id": file_id,
                }
            )
        )

    result: bool = await check_exists_files_being_indexed(
        application_id=grant_application.id,
        session_maker=async_session_maker,
    )
    assert result is True


@pytest.mark.parametrize(
    "indexing_status",
    [SourceIndexingStatusEnum.FINISHED, SourceIndexingStatusEnum.FAILED],
)
async def test_check_exists_files_being_indexed_application_non_indexing_status(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    indexing_status: SourceIndexingStatusEnum,
) -> None:
    file_id: UUID = uuid4()
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagSource).values(
                {
                    "id": file_id,
                    "source_type": RAG_FILE,
                    "indexing_status": indexing_status,
                }
            )
        )

        await session.execute(
            insert(RagFile).values(
                {
                    "id": file_id,
                    "filename": "test.txt",
                    "mime_type": "text/plain",
                    "size": 100,
                    "bucket_name": "test-bucket",
                    "object_path": "test-file-path",
                }
            )
        )
        await session.execute(
            insert(GrantApplicationRagSource).values(
                {
                    "grant_application_id": grant_application.id,
                    "rag_source_id": file_id,
                }
            )
        )

    result: bool = await check_exists_files_being_indexed(
        application_id=grant_application.id,
        session_maker=async_session_maker,
    )
    assert result is False


async def test_check_exists_files_being_indexed_application_no_files(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    result: bool = await check_exists_files_being_indexed(
        application_id=grant_application.id,
        session_maker=async_session_maker,
    )
    assert result is False


async def test_check_exists_files_being_indexed_organization_success(
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
) -> None:
    file_id: UUID = uuid4()
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagSource).values(
                {
                    "id": file_id,
                    "source_type": RAG_FILE,
                    "indexing_status": SourceIndexingStatusEnum.INDEXING,
                }
            )
        )

        await session.execute(
            insert(RagFile).values(
                {
                    "id": file_id,
                    "filename": "test.txt",
                    "mime_type": "text/plain",
                    "size": 100,
                    "bucket_name": "test-bucket",
                    "object_path": "test-file-path",
                }
            )
        )
        await session.execute(
            insert(FundingOrganizationRagSource).values(
                {
                    "funding_organization_id": funding_organization.id,
                    "rag_source_id": file_id,
                }
            )
        )

    result: bool = await check_exists_files_being_indexed(
        organization_id=funding_organization.id,
        session_maker=async_session_maker,
    )
    assert result is True


@pytest.mark.parametrize(
    "indexing_status",
    [SourceIndexingStatusEnum.FINISHED, SourceIndexingStatusEnum.FAILED],
)
async def test_check_exists_files_being_indexed_organization_non_indexing_status(
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
    indexing_status: SourceIndexingStatusEnum,
) -> None:
    file_id: UUID = uuid4()
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagSource).values(
                {
                    "id": file_id,
                    "source_type": RAG_FILE,
                    "indexing_status": indexing_status,
                }
            )
        )

        await session.execute(
            insert(RagFile).values(
                {
                    "id": file_id,
                    "filename": "test.txt",
                    "mime_type": "text/plain",
                    "size": 100,
                    "bucket_name": "test-bucket",
                    "object_path": "test-file-path",
                }
            )
        )
        await session.execute(
            insert(FundingOrganizationRagSource).values(
                {
                    "funding_organization_id": funding_organization.id,
                    "rag_source_id": file_id,
                }
            )
        )

    result: bool = await check_exists_files_being_indexed(
        organization_id=funding_organization.id,
        session_maker=async_session_maker,
    )
    assert result is False


async def test_check_exists_files_being_indexed_organization_no_files(
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
) -> None:
    result: bool = await check_exists_files_being_indexed(
        organization_id=funding_organization.id,
        session_maker=async_session_maker,
    )
    assert result is False


async def test_check_exists_files_being_indexed_validation_error(
    async_session_maker: async_sessionmaker[Any],
) -> None:
    with pytest.raises(ValidationError):
        await check_exists_files_being_indexed(
            session_maker=async_session_maker,
        )


async def test_update_source_indexing_status_success(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    file_id: UUID = uuid4()
    parent_id = grant_application.id

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagSource).values(
                {
                    "id": file_id,
                    "source_type": RAG_FILE,
                    "indexing_status": SourceIndexingStatusEnum.CREATED,
                    "text_content": "",
                }
            )
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": file_id,
                    "filename": "test.pdf",
                    "mime_type": "application/pdf",
                    "size": 1000,
                    "bucket_name": "test-bucket",
                    "object_path": "test-path",
                }
            )
        )
        await session.execute(
            insert(GrantApplicationRagSource).values(
                {
                    "grant_application_id": parent_id,
                    "rag_source_id": file_id,
                }
            )
        )

    mock_logger = Mock(spec=BoundLogger)
    vectors = [
        VectorDTO(
            chunk={"content": "test content"},
            embedding=[0.1] * 384,
            rag_source_id=str(file_id),
        )
    ]

    with patch("packages.db.src.utils.publish_notification") as mock_publish:
        mock_publish.return_value = "test-message-id"

        await update_source_indexing_status(
            logger=mock_logger,
            session_maker=async_session_maker,
            source_id=file_id,
            parent_id=parent_id,
            identifier="test.pdf",
            text_content="Test content extracted from PDF",
            vectors=vectors,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )

        assert mock_publish.call_count == 1

        call = mock_publish.call_args
        assert call.kwargs["logger"] == mock_logger
        assert call.kwargs["parent_id"] == parent_id
        assert call.kwargs["event"] == "source_processing"
        assert call.kwargs["data"]["source_id"] == file_id
        assert call.kwargs["data"]["indexing_status"] == SourceIndexingStatusEnum.FINISHED
        assert call.kwargs["data"]["identifier"] == "test.pdf"

    async with async_session_maker() as session:
        source = await session.scalar(select(RagSource).where(RagSource.id == file_id))
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FINISHED
        assert source.text_content == "Test content extracted from PDF"


async def test_update_source_indexing_status_no_vectors(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    file_id: UUID = uuid4()
    parent_id = grant_application.id

    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagSource).values(
                {
                    "id": file_id,
                    "source_type": RAG_FILE,
                    "indexing_status": SourceIndexingStatusEnum.CREATED,
                    "text_content": "",
                }
            )
        )
        await session.execute(
            insert(RagFile).values(
                {
                    "id": file_id,
                    "filename": "empty.pdf",
                    "mime_type": "application/pdf",
                    "size": 100,
                    "bucket_name": "test-bucket",
                    "object_path": "test-path",
                }
            )
        )
        await session.execute(
            insert(GrantApplicationRagSource).values(
                {
                    "grant_application_id": parent_id,
                    "rag_source_id": file_id,
                }
            )
        )

    mock_logger = Mock(spec=BoundLogger)

    with patch("packages.db.src.utils.publish_notification") as mock_publish:
        mock_publish.return_value = "test-message-id"

        await update_source_indexing_status(
            logger=mock_logger,
            session_maker=async_session_maker,
            source_id=file_id,
            parent_id=parent_id,
            identifier="empty.pdf",
            text_content="",
            vectors=None,
            indexing_status=SourceIndexingStatusEnum.FAILED,
        )

        assert mock_publish.call_count == 1

        call = mock_publish.call_args
        assert call.kwargs["data"]["indexing_status"] == SourceIndexingStatusEnum.FAILED

    async with async_session_maker() as session:
        source = await session.scalar(select(RagSource).where(RagSource.id == file_id))
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FAILED
        assert source.text_content == ""


async def test_update_source_indexing_status_database_error(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    file_id: UUID = uuid4()
    parent_id = grant_application.id

    mock_logger = Mock(spec=BoundLogger)
    mock_logger.exception = Mock()

    # Create a mock session maker that returns a session that fails
    mock_session_maker = Mock()
    mock_session = AsyncMock()
    mock_session_maker.return_value = mock_session

    # Set up the async context managers
    mock_session.__aenter__.return_value = mock_session
    mock_session.__aexit__.return_value = None

    # Create a mock for session.begin() that also acts as an async context manager
    mock_begin = AsyncMock()
    mock_begin.__aenter__.return_value = mock_session
    mock_begin.__aexit__.return_value = None
    mock_session.begin = Mock(return_value=mock_begin)

    # Make execute raise an error
    mock_session.execute.side_effect = SQLAlchemyError("Database error")
    mock_session.rollback = AsyncMock()

    with patch("packages.db.src.utils.publish_notification") as mock_publish:
        mock_publish.return_value = "test-message-id"

        # Should not raise, but should send a FAILED notification
        await update_source_indexing_status(
            logger=mock_logger,
            session_maker=mock_session_maker,
            source_id=file_id,
            parent_id=parent_id,
            identifier="test.pdf",
            text_content="Test content",
            vectors=None,
            indexing_status=SourceIndexingStatusEnum.FINISHED,
        )

        # Should have logged the exception
        mock_logger.exception.assert_called_once()

        # Should have sent a FAILED notification
        assert mock_publish.call_count == 1
        call = mock_publish.call_args
        assert call.kwargs["data"]["indexing_status"] == SourceIndexingStatusEnum.FAILED
