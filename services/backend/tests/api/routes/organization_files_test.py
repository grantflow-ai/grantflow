from http import HTTPStatus
from typing import Any
from unittest.mock import Mock

import pytest
from packages.db.src.tables import FundingOrganization, OrganizationFile, RagSource
from services.backend.tests.conftest import TestingClientType
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
async def organization_file(
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
    file: RagSource,
) -> OrganizationFile:
    org_file = OrganizationFile(funding_organization_id=funding_organization.id, rag_file_id=file.id)
    async with async_session_maker() as session, session.begin():
        session.add(org_file)
        await session.commit()
    return org_file


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
            await session.get_one(RagSource, organization_file.rag_file_id)

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
