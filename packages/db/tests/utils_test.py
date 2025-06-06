from typing import Any
from uuid import UUID, uuid4

import pytest
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker

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
from packages.db.src.utils import check_exists_files_being_indexed
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
