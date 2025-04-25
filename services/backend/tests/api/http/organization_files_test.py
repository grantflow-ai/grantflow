from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker

from db.src.enums import FileIndexingStatusEnum
from db.src.tables import FundingOrganization, OrganizationFile, RagFile
from tests.conftest import TestingClientType


@pytest.fixture
async def organization_file(
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
    file: RagFile,
) -> OrganizationFile:
    org_file = OrganizationFile(funding_organization_id=funding_organization.id, rag_file_id=file.id)
    async with async_session_maker() as session, session.begin():
        session.add(org_file)
        await session.commit()
    return org_file


async def test_upload_organization_files_success(
    test_client: TestingClientType,
    funding_organization: FundingOrganization,
    signal_dispatch_mock: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    mock_admin_code: Mock,
) -> None:
    test_files = {
        "test1.txt": b"Test content 1",
        "test2.txt": b"Test content 2",
    }

    response = await test_client.post(
        f"/organizations/{funding_organization.id}/files",
        files=test_files,
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.CREATED

    async with async_session_maker() as session:
        files = (await session.scalars(select(RagFile))).all()
        assert len(files) == 2

        for file in files:
            assert file.indexing_status == FileIndexingStatusEnum.INDEXING
            assert file.filename in test_files

        org_files = (
            await session.scalars(
                select(OrganizationFile).where(OrganizationFile.funding_organization_id == funding_organization.id)
            )
        ).all()
        assert len(org_files) == 2

    signal_calls = [call for call in signal_dispatch_mock.mock_calls if call.args[0] == "parse_and_index_file"]
    assert len(signal_calls) == 2
    for call in signal_calls:
        assert "file_id" in call.kwargs
        assert "file_dto" in call.kwargs


async def test_upload_organization_files_failure_no_files(
    test_client: TestingClientType, funding_organization: FundingOrganization, mock_admin_code: Mock
) -> None:
    response = await test_client.post(
        f"/organizations/{funding_organization.id}/files",
        files={},
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_retrieve_organization_files_success(
    test_client: TestingClientType,
    funding_organization: FundingOrganization,
    organization_file: OrganizationFile,
    mock_admin_code: Mock,
) -> None:
    response = await test_client.get(
        f"/organizations/{funding_organization.id}/files",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.OK
    files = response.json()
    assert len(files) == 1
    assert files[0]["id"] == str(organization_file.rag_file_id)


async def test_delete_organization_file_success(
    test_client: TestingClientType,
    funding_organization: FundingOrganization,
    organization_file: OrganizationFile,
    async_session_maker: async_sessionmaker[Any],
    mock_admin_code: Mock,
) -> None:
    response = await test_client.delete(
        f"/organizations/{funding_organization.id}/files/{organization_file.rag_file_id}",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        with pytest.raises(NoResultFound):
            await session.get_one(RagFile, organization_file.rag_file_id)

        with pytest.raises(NoResultFound):
            await session.get_one(
                OrganizationFile,
                {
                    "funding_organization_id": funding_organization.id,
                    "rag_file_id": organization_file.rag_file_id,
                },
            )


async def test_delete_organization_file_not_found(
    test_client: TestingClientType, funding_organization: FundingOrganization, mock_admin_code: Mock
) -> None:
    response = await test_client.delete(
        f"/organizations/{funding_organization.id}/files/00000000-0000-0000-0000-000000000000",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND


@pytest.mark.parametrize(
    "headers",
    [
        {"Authorization": "wrong-code"},
        {},
    ],
)
async def test_organization_files_unauthorized(
    test_client: TestingClientType,
    funding_organization: FundingOrganization,
    headers: dict[str, str],
    mock_admin_code: Mock,
) -> None:
    response = await test_client.post(
        f"/organizations/{funding_organization.id}/files",
        files={"test.txt": b"Test content"},
        headers=headers,
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED

    response = await test_client.get(
        f"/organizations/{funding_organization.id}/files",
        headers=headers,
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED

    response = await test_client.delete(
        f"/organizations/{funding_organization.id}/files/00000000-0000-0000-0000-000000000000",
        headers=headers,
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED
