from typing import Any
from unittest.mock import AsyncMock, Mock
from uuid import UUID, uuid4

import pytest
from packages.db.src.constants import RAG_FILE
from packages.db.src.enums import SourceIndexingStatusEnum
from packages.db.src.tables import (
    GrantApplication,
    GrantApplicationSource,
    GrantingInstitution,
    GrantingInstitutionSource,
    RagFile,
    RagSource,
)
from packages.db.src.utils import check_exists_files_being_indexed, update_source_indexing_status
from packages.shared_utils.src.dto import VectorDTO
from packages.shared_utils.src.exceptions import ValidationError
from sqlalchemy import insert, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker


async def test_check_exists_files_being_indexed_application_success(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationSource,
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
            insert(GrantApplicationSource).values(
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
            insert(GrantApplicationSource).values(
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
    granting_institution: GrantingInstitution,
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
            insert(GrantingInstitutionSource).values(
                {
                    "granting_institution_id": granting_institution.id,
                    "rag_source_id": file_id,
                }
            )
        )

    result: bool = await check_exists_files_being_indexed(
        organization_id=granting_institution.id,
        session_maker=async_session_maker,
    )
    assert result is True


@pytest.mark.parametrize(
    "indexing_status",
    [SourceIndexingStatusEnum.FINISHED, SourceIndexingStatusEnum.FAILED],
)
async def test_check_exists_files_being_indexed_organization_non_indexing_status(
    async_session_maker: async_sessionmaker[Any],
    granting_institution: GrantingInstitution,
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
            insert(GrantingInstitutionSource).values(
                {
                    "granting_institution_id": granting_institution.id,
                    "rag_source_id": file_id,
                }
            )
        )

    result: bool = await check_exists_files_being_indexed(
        organization_id=granting_institution.id,
        session_maker=async_session_maker,
    )
    assert result is False


async def test_check_exists_files_being_indexed_organization_no_files(
    async_session_maker: async_sessionmaker[Any],
    granting_institution: GrantingInstitution,
) -> None:
    result: bool = await check_exists_files_being_indexed(
        organization_id=granting_institution.id,
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
    trace_id: str,
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
            insert(GrantApplicationSource).values(
                {
                    "grant_application_id": parent_id,
                    "rag_source_id": file_id,
                }
            )
        )

    mock_logger = Mock()
    mock_logger.debug = Mock()
    mock_logger.exception = Mock()
    vectors = [
        VectorDTO(
            chunk={"content": "test content"},
            embedding=[0.1] * 384,
            rag_source_id=str(file_id),
        )
    ]

    await update_source_indexing_status(
        logger=mock_logger,
        session_maker=async_session_maker,
        source_id=file_id,
        grant_application_id=parent_id,
        identifier="test.pdf",
        text_content="Test content extracted from PDF",
        vectors=vectors,
        indexing_status=SourceIndexingStatusEnum.FINISHED,
        trace_id=trace_id,
    )

    async with async_session_maker() as session:
        source = await session.scalar(select(RagSource).where(RagSource.id == file_id))
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FINISHED
        assert source.text_content == "Test content extracted from PDF"


async def test_update_source_indexing_status_no_vectors(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    trace_id: str,
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
            insert(GrantApplicationSource).values(
                {
                    "grant_application_id": parent_id,
                    "rag_source_id": file_id,
                }
            )
        )

    mock_logger = Mock()
    mock_logger.debug = Mock()
    mock_logger.exception = Mock()

    await update_source_indexing_status(
        logger=mock_logger,
        session_maker=async_session_maker,
        source_id=file_id,
        grant_application_id=parent_id,
        identifier="empty.pdf",
        text_content="",
        vectors=None,
        indexing_status=SourceIndexingStatusEnum.FAILED,
        trace_id=trace_id,
    )

    async with async_session_maker() as session:
        source = await session.scalar(select(RagSource).where(RagSource.id == file_id))
        assert source is not None
        assert source.indexing_status == SourceIndexingStatusEnum.FAILED
        assert source.text_content == ""


async def test_update_source_indexing_status_database_error(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    trace_id: str,
) -> None:
    file_id: UUID = uuid4()

    mock_logger = Mock()
    mock_logger.debug = Mock()
    mock_logger.exception = Mock()

    mock_session_maker = Mock()
    mock_session = AsyncMock()
    mock_session_maker.return_value = mock_session

    mock_session.__aenter__.return_value = mock_session
    mock_session.__aexit__.return_value = None

    mock_begin = AsyncMock()
    mock_begin.__aenter__.return_value = mock_session
    mock_begin.__aexit__.return_value = None
    mock_session.begin = Mock(return_value=mock_begin)

    mock_session.execute.side_effect = SQLAlchemyError("Database error")
    mock_session.rollback = AsyncMock()

    await update_source_indexing_status(
        logger=mock_logger,
        session_maker=mock_session_maker,
        source_id=file_id,
        grant_application_id=grant_application.id,
        identifier="test.pdf",
        text_content="Test content",
        vectors=None,
        indexing_status=SourceIndexingStatusEnum.FINISHED,
        trace_id=trace_id,
    )

    mock_logger.exception.assert_called_once()
