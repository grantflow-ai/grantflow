from http import HTTPStatus
from os import environ
from typing import Any
from unittest.mock import AsyncMock

import pytest
from sanic_testing.testing import SanicASGITestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from src.api_types import CreateGrantTemplateRequestBody, TableIdResponse
from src.db.enums import FileIndexingStatusEnum
from src.db.tables import FundingOrganization, GrantTemplate, OrganizationFile
from src.utils.serialization import deserialize, serialize
from tests.conftest import RESULTS_FOLDER, SOURCES_FOLDER

TEST_CFP_URL = "https://grants.nih.gov/grants/guide/rfa-files/RFA-DC-25-005.html"
GUIDELINES_FILE = SOURCES_FOLDER / "NIH- Instructions for Research (R).pdf"


@pytest.mark.skipif(
    not environ.get("E2E_TESTS"),
    reason="End-to-end tests are disabled. Set E2E_TESTS to execute the E2E tests",
)
async def test_grant_template_create_e2e(
    funding_organization: FundingOrganization,
    asgi_client: SanicASGITestClient,
    async_session_maker: async_sessionmaker[Any],
    signal_dispatch_mock: AsyncMock,
) -> None:
    request_body = CreateGrantTemplateRequestBody(
        funding_organization_id=str(funding_organization.id),
        cfp_url=TEST_CFP_URL,
    )

    _, response = await asgi_client.post(
        "/grant-templates",
        data={
            "data": serialize(request_body).decode(),
        },
        files={
            "guidelines_files": (GUIDELINES_FILE.name, GUIDELINES_FILE.read_bytes()),
        },
    )

    assert response.status_code == HTTPStatus.CREATED, response.text
    response_body = deserialize(response.text, TableIdResponse)
    assert response_body["id"]

    async with async_session_maker() as session:
        org_file = await session.scalar(
            select(OrganizationFile)
            .options(selectinload(OrganizationFile.file))
            .where(
                OrganizationFile.funding_organization_id == funding_organization.id,
            )
        )
        assert org_file
        assert org_file.file.status == FileIndexingStatusEnum.INDEXING
        grant_template = await session.scalar(
            select(GrantTemplate).where(
                GrantTemplate.id == response_body["id"],
            )
        )
        assert grant_template

    signal_calls = [
        call
        for call in signal_dispatch_mock.mock_calls
        if call.args[0] in ["parse_and_index_file", "handle_generate_grant_template"]
    ]
    assert len(signal_calls) == 2

    parse_index_call = next(filter(lambda call: call.args[0] == "parse_and_index_file", signal_calls))

    assert "file_dto" in parse_index_call.kwargs["context"]
    assert "file_id" in parse_index_call.kwargs["context"]

    handle_generate_grant_template_call = next(
        filter(lambda call: call.args[0] == "handle_generate_grant_template", signal_calls)
    )

    assert "organization_id" in handle_generate_grant_template_call.kwargs["context"]
    assert "grant_template_id" in handle_generate_grant_template_call.kwargs["context"]
    assert "cfp_content" in handle_generate_grant_template_call.kwargs["context"]

    cfp_content_file = RESULTS_FOLDER / "extracted_cfp_content.md"

    if not cfp_content_file.exists():
        cfp_content_file.write_text(handle_generate_grant_template_call.kwargs["context"]["cfp_content"])
    else:
        assert handle_generate_grant_template_call.kwargs["context"]["cfp_content"] == cfp_content_file.read_text()
