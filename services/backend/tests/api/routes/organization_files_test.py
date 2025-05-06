from http import HTTPStatus
from typing import Any
from unittest.mock import Mock

import pytest
from packages.db.src.tables import FundingOrganization, OrganizationRagSource, RagFile
from services.backend.tests.conftest import TestingClientType
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
async def organization_file(
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
    file: RagFile,
) -> OrganizationRagSource:
    org_file = OrganizationRagSource(funding_organization_id=funding_organization.id, rag_source_id=file.id)
    async with async_session_maker() as session, session.begin():
        session.add(org_file)
        await session.commit()
    return org_file


async def test_retrieve_organization_files_success(
    test_client: TestingClientType,
    funding_organization: FundingOrganization,
    organization_file: OrganizationRagSource,
    file: RagFile,
    mock_admin_code: Mock,
) -> None:
    response = await test_client.get(
        f"/organizations/{funding_organization.id}/files",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.OK
    files = response.json()
    assert len(files) == 1
    assert files[0]["id"] == str(organization_file.rag_source_id)
    assert files[0]["filename"] == file.filename
    assert files[0]["size"] == file.size
    assert files[0]["mime_type"] == file.mime_type
    assert files[0]["indexing_status"] == file.indexing_status.value


async def test_delete_organization_file_success(
    test_client: TestingClientType,
    funding_organization: FundingOrganization,
    organization_file: OrganizationRagSource,
    async_session_maker: async_sessionmaker[Any],
    mock_admin_code: Mock,
) -> None:
    response = await test_client.delete(
        f"/organizations/{funding_organization.id}/files/{organization_file.rag_source_id}",
        headers={"Authorization": "test-admin-code"},
    )

    assert response.status_code == HTTPStatus.NO_CONTENT

    async with async_session_maker() as session:
        with pytest.raises(NoResultFound):
            await session.get_one(RagFile, organization_file.rag_source_id)

        with pytest.raises(NoResultFound):
            await session.get_one(
                OrganizationRagSource,
                {
                    "funding_organization_id": funding_organization.id,
                    "rag_source_id": organization_file.rag_source_id,
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

    assert response.json() == {"detail": "Not Found", "status_code": HTTPStatus.NOT_FOUND.value}
