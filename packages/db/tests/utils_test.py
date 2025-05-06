from typing import Any
from uuid import UUID, uuid4

import pytest
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker

from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import (
    FundingOrganization,
    GrantApplication,
    GrantApplicationRagSource,
    OrganizationRagSource,
    RagFile,
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
            insert(RagFile).values(
                {
                    "id": file_id,
                    "filename": "test.txt",
                    "mime_type": "text/plain",
                    "size": 100,
                    "indexing_status": FileIndexingStatusEnum.INDEXING,
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
    [FileIndexingStatusEnum.FINISHED, FileIndexingStatusEnum.FAILED],
)
async def test_check_exists_files_being_indexed_application_non_indexing_status(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    indexing_status: FileIndexingStatusEnum,
) -> None:
    file_id: UUID = uuid4()
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagFile).values(
                {
                    "id": file_id,
                    "filename": "test.txt",
                    "mime_type": "text/plain",
                    "size": 100,
                    "indexing_status": indexing_status,
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
            insert(RagFile).values(
                {
                    "id": file_id,
                    "filename": "test.txt",
                    "mime_type": "text/plain",
                    "size": 100,
                    "indexing_status": FileIndexingStatusEnum.INDEXING,
                    "bucket_name": "test-bucket",
                    "object_path": "test-file-path",
                }
            )
        )
        await session.execute(
            insert(OrganizationRagSource).values(
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
    [FileIndexingStatusEnum.FINISHED, FileIndexingStatusEnum.FAILED],
)
async def test_check_exists_files_being_indexed_organization_non_indexing_status(
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
    indexing_status: FileIndexingStatusEnum,
) -> None:
    file_id: UUID = uuid4()
    async with async_session_maker() as session, session.begin():
        await session.execute(
            insert(RagFile).values(
                {
                    "id": file_id,
                    "filename": "test.txt",
                    "mime_type": "text/plain",
                    "size": 100,
                    "indexing_status": indexing_status,
                    "bucket_name": "test-bucket",
                    "object_path": "test-file-path",
                }
            )
        )
        await session.execute(
            insert(OrganizationRagSource).values(
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
