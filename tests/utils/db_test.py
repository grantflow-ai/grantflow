from typing import Any
from uuid import UUID, uuid4

import pytest
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.db.enums import FileIndexingStatusEnum
from src.db.tables import (
    FundingOrganization,
    GrantApplication,
    GrantApplicationFile,
    OrganizationFile,
    RagFile,
)
from src.exceptions import ValidationError
from src.utils.db import check_exists_files_being_indexed


async def test_check_exists_files_being_indexed_application_success(
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
    grant_application_file: GrantApplicationFile,
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
                }
            )
        )
        await session.execute(
            insert(GrantApplicationFile).values(
                {
                    "grant_application_id": grant_application.id,
                    "rag_file_id": file_id,
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
                }
            )
        )
        await session.execute(
            insert(GrantApplicationFile).values(
                {
                    "grant_application_id": grant_application.id,
                    "rag_file_id": file_id,
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
                }
            )
        )
        await session.execute(
            insert(OrganizationFile).values(
                {
                    "funding_organization_id": funding_organization.id,
                    "rag_file_id": file_id,
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
                }
            )
        )
        await session.execute(
            insert(OrganizationFile).values(
                {
                    "funding_organization_id": funding_organization.id,
                    "rag_file_id": file_id,
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
