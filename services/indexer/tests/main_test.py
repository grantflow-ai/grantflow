from collections.abc import Generator
from http import HTTPStatus
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from litestar.testing import AsyncTestClient
from packages.db.src.enums import FileIndexingStatusEnum
from packages.db.src.tables import (
    FundingOrganization,
    GrantApplication,
    GrantApplicationRagSource,
    GrantTemplate,
    GrantTemplateRagSource,
    OrganizationRagSource,
    RagFile,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
def mock_download_blob() -> Generator[AsyncMock, None, None]:
    with patch("services.indexer.src.main.download_blob") as mock:
        mock.return_value = b"Test file content"
        yield mock


@pytest.fixture
def mock_parse_and_index_file() -> Generator[AsyncMock, None, None]:
    with patch("services.indexer.src.main.parse_and_index_file") as mock:
        mock.return_value = None
        yield mock


async def test_handle_file_indexing_grant_application(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_and_index_file: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    grant_application: GrantApplication,
) -> None:
    with patch("services.indexer.src.main.EXT_TO_MIME_TYPE") as mock_mime_types:
        mock_mime_types.__getitem__.return_value = "application/pdf"

        file_path = f"grant_application/{grant_application.id}/document.pdf"
        file_data = {
            "file_path": file_path,
        }

        response = await test_client.post("/", json=file_data)
        assert response.status_code == HTTPStatus.CREATED
        response_json = response.json()
        assert response_json["message"] == "File indexing successful."
        assert "source_id" in response_json
        source_id = response_json["source_id"]

        async with async_session_maker() as session:
            rag_file = await session.scalars(select(RagFile).where(RagFile.id == UUID(source_id)))
            file = rag_file.first()
            assert file is not None
            assert file.filename == "document.pdf"
            assert file.mime_type == "application/pdf"
            assert file.size == len(b"Test file content")
            assert file.indexing_status == FileIndexingStatusEnum.INDEXING

            assert file.bucket_name
            assert file.object_path == file_path

            app_file = await session.scalars(
                select(GrantApplicationRagSource).where(GrantApplicationRagSource.rag_source_id == UUID(source_id))
            )
            app_file_record = app_file.first()
            assert app_file_record is not None
            assert app_file_record.grant_application_id == grant_application.id

        mock_download_blob.assert_awaited_once_with(file_path)
        mock_parse_and_index_file.assert_awaited_once()
        assert mock_parse_and_index_file.call_args[1]["source_id"] == source_id
        assert mock_parse_and_index_file.call_args[1]["filename"] == "document.pdf"
        assert mock_parse_and_index_file.call_args[1]["mime_type"] == "application/pdf"


async def test_handle_file_indexing_funding_organization(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_and_index_file: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    funding_organization: FundingOrganization,
) -> None:
    with patch("services.indexer.src.main.EXT_TO_MIME_TYPE") as mock_mime_types:
        mock_mime_types.__getitem__.return_value = "application/pdf"

        file_path = f"funding_organization/{funding_organization.id}/guidelines.pdf"
        file_data = {
            "file_path": file_path,
        }

        response = await test_client.post("/", json=file_data)
        assert response.status_code == HTTPStatus.CREATED
        response_json = response.json()
        assert response_json["message"] == "File indexing successful."
        assert "source_id" in response_json
        source_id = response_json["source_id"]

        async with async_session_maker() as session:
            rag_file = await session.scalars(select(RagFile).where(RagFile.id == UUID(source_id)))
            file = rag_file.first()
            assert file is not None
            assert file.filename == "guidelines.pdf"
            assert file.mime_type == "application/pdf"
            assert file.size == len(b"Test file content")
            assert file.indexing_status == FileIndexingStatusEnum.INDEXING

            org_file = await session.scalars(
                select(OrganizationRagSource).where(OrganizationRagSource.rag_source_id == UUID(source_id))
            )
            org_file_record = org_file.first()
            assert org_file_record is not None
            assert org_file_record.funding_organization_id == funding_organization.id

        mock_download_blob.assert_awaited_once_with(file_path)
        mock_parse_and_index_file.assert_awaited_once()


async def test_handle_file_indexing_grant_template(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_and_index_file: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
    grant_template: GrantTemplate,
) -> None:
    with patch("services.indexer.src.main.EXT_TO_MIME_TYPE") as mock_mime_types:
        mock_mime_types.__getitem__.return_value = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

        file_path = f"grant_template/{grant_template.id}/template.docx"
        file_data = {
            "file_path": file_path,
        }

        response = await test_client.post("/", json=file_data)
        assert response.status_code == HTTPStatus.CREATED
        response_json = response.json()
        assert response_json["message"] == "File indexing successful."
        assert "source_id" in response_json
        source_id = response_json["source_id"]

        async with async_session_maker() as session:
            rag_file = await session.scalars(select(RagFile).where(RagFile.id == UUID(source_id)))
            file = rag_file.first()
            assert file is not None
            assert file.filename == "template.docx"
            assert file.mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            assert file.size == len(b"Test file content")
            assert file.indexing_status == FileIndexingStatusEnum.INDEXING

            template_file = await session.scalars(
                select(GrantTemplateRagSource).where(GrantTemplateRagSource.rag_source_id == UUID(source_id))
            )
            template_file_record = template_file.first()
            assert template_file_record is not None
            assert template_file_record.grant_template_id == grant_template.id

        mock_download_blob.assert_awaited_once_with(file_path)
        mock_parse_and_index_file.assert_awaited_once()


async def test_handle_file_indexing_invalid_path(
    test_client: AsyncTestClient[Any],
) -> None:
    file_data = {
        "file_path": "invalid_path",
    }

    response = await test_client.post("/", json=file_data)
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_handle_file_indexing_unsupported_extension(
    test_client: AsyncTestClient[Any],
    grant_application: GrantApplication,
) -> None:
    file_data = {
        "file_path": f"grant_application/{grant_application.id}/document.unsupported",
    }

    response = await test_client.post("/", json=file_data)
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_handle_file_indexing_download_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    grant_application: GrantApplication,
) -> None:
    with patch("services.indexer.src.main.EXT_TO_MIME_TYPE") as mock_mime_types:
        mock_mime_types.__getitem__.return_value = "application/pdf"

        file_path = f"grant_application/{grant_application.id}/document.pdf"
        file_data = {
            "file_path": file_path,
        }
        mock_download_blob.side_effect = Exception("Failed to download blob")

        response = await test_client.post("/", json=file_data)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_file_indexing_parsing_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    mock_parse_and_index_file: AsyncMock,
    grant_application: GrantApplication,
) -> None:
    with patch("services.indexer.src.main.EXT_TO_MIME_TYPE") as mock_mime_types:
        mock_mime_types.__getitem__.return_value = "application/pdf"

        file_path = f"grant_application/{grant_application.id}/document.pdf"
        file_data = {
            "file_path": file_path,
        }
        mock_parse_and_index_file.side_effect = Exception("Failed to parse and index file")

        response = await test_client.post("/", json=file_data)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR


async def test_handle_database_error(
    test_client: AsyncTestClient[Any],
    mock_download_blob: AsyncMock,
    grant_application: GrantApplication,
) -> None:
    with patch("services.indexer.src.main.EXT_TO_MIME_TYPE") as mock_mime_types:
        mock_mime_types.__getitem__.return_value = "application/pdf"

        file_path = f"grant_application/{grant_application.id}/document.pdf"
        file_data = {
            "file_path": file_path,
        }

        with patch("services.indexer.src.main.insert") as mock_insert:
            mock_insert.side_effect = Exception("Database error")

            response = await test_client.post("/", json=file_data)

            assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
