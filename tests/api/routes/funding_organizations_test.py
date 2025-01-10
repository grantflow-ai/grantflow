from http import HTTPStatus
from typing import Any
from unittest.mock import Mock

import pytest
from sanic_testing.testing import SanicASGITestClient
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.api_types import CreateOrganizationRequestBody
from src.db.tables import FundingOrganization
from src.utils.serialization import deserialize


async def test_create_organization_api_request_success(
    asgi_client: SanicASGITestClient, async_session_maker: async_sessionmaker[Any], mock_admin_code: Mock
) -> None:
    request_body: CreateOrganizationRequestBody = {
        "full_name": "Test Organization",
        "abbreviation": "TEST",
    }
    _, response = await asgi_client.post(
        "/organizations",
        json=request_body,
        headers={"Authorization": "test-admin-code"},
    )
    assert response.status_code == HTTPStatus.CREATED

    response_body = deserialize(response.text, CreateOrganizationRequestBody)
    assert response_body["full_name"] == request_body["full_name"]
    assert response_body["abbreviation"] == request_body["abbreviation"]

    async with async_session_maker() as session, session.begin():
        organization = await session.scalar(
            select(FundingOrganization).where(FundingOrganization.full_name == request_body["full_name"])
        )
        assert organization is not None
        assert organization.full_name == request_body["full_name"]
        assert organization.abbreviation == request_body["abbreviation"]


@pytest.mark.parametrize(
    "headers",
    [
        {"Authorization": "wrong-code"},
        {},
    ],
)
async def test_create_organization_api_request_failure_unauthorized(
    asgi_client: SanicASGITestClient, headers: dict[str, str], mock_admin_code: Mock
) -> None:
    request_body: CreateOrganizationRequestBody = {
        "full_name": "Test Organization",
        "abbreviation": None,
    }
    _, response = await asgi_client.post(
        "/organizations",
        json=request_body,
        headers=headers,
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_create_organization_api_request_failure_bad_request(
    asgi_client: SanicASGITestClient, mock_admin_code: Mock
) -> None:
    _, response = await asgi_client.post(
        "/organizations",
        json={},
        headers={"Authorization": "test-admin-code"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_retrieve_organizations_api_request_success(
    asgi_client: SanicASGITestClient, async_session_maker: async_sessionmaker[Any], mock_admin_code: Mock
) -> None:
    orgs = [
        FundingOrganization(full_name="Test Org B", abbreviation="TB"),
        FundingOrganization(full_name="Test Org A", abbreviation="TA"),
    ]

    async with async_session_maker() as session, session.begin():
        session.add_all(orgs)
        await session.commit()

    _, response = await asgi_client.get(
        "/organizations",
        headers={"Authorization": "test-admin-code"},
    )
    assert response.status_code == HTTPStatus.OK

    response_data = deserialize(response.text, list[CreateOrganizationRequestBody])
    assert len(response_data) == 2
    assert response_data[0]["full_name"] == "Test Org A"
    assert response_data[1]["full_name"] == "Test Org B"


@pytest.mark.parametrize(
    "headers",
    [
        {"Authorization": "wrong-code"},
        {},
    ],
)
async def test_retrieve_organizations_api_request_failure_unauthorized(
    asgi_client: SanicASGITestClient, headers: dict[str, str], mock_admin_code: Mock
) -> None:
    _, response = await asgi_client.get(
        "/organizations",
        headers=headers,
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_organization_api_request_success(
    asgi_client: SanicASGITestClient,
    funding_organization: FundingOrganization,
    async_session_maker: async_sessionmaker[Any],
    mock_admin_code: Mock,
) -> None:
    request_body: CreateOrganizationRequestBody = {
        "full_name": "Updated Organization",
        "abbreviation": "UPD",
    }

    _, response = await asgi_client.patch(
        f"/organizations/{funding_organization.id}",
        json=request_body,
        headers={"Authorization": "test-admin-code"},
    )
    assert response.status_code == HTTPStatus.CREATED

    async with async_session_maker() as session, session.begin():
        organization = await session.get(FundingOrganization, funding_organization.id)
        assert organization.full_name == request_body["full_name"]
        assert organization.abbreviation == request_body["abbreviation"]


@pytest.mark.parametrize(
    "headers",
    [
        {"Authorization": "wrong-code"},
        {},
    ],
)
async def test_update_organization_api_request_failure_unauthorized(
    asgi_client: SanicASGITestClient,
    funding_organization: FundingOrganization,
    headers: dict[str, str],
    mock_admin_code: Mock,
) -> None:
    request_body: CreateOrganizationRequestBody = {
        "full_name": "Updated Organization",
        "abbreviation": None,
    }
    _, response = await asgi_client.patch(
        f"/organizations/{funding_organization.id}",
        json=request_body,
        headers=headers,
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED


async def test_update_organization_api_request_failure_empty_body(
    asgi_client: SanicASGITestClient, funding_organization: FundingOrganization, mock_admin_code: Mock
) -> None:
    _, response = await asgi_client.patch(
        f"/organizations/{funding_organization.id}",
        json={},
        headers={"Authorization": "test-admin-code"},
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST


async def test_delete_organization_api_request_success(
    asgi_client: SanicASGITestClient,
    funding_organization: FundingOrganization,
    async_session_maker: async_sessionmaker[Any],
    mock_admin_code: Mock,
) -> None:
    _, response = await asgi_client.delete(
        f"/organizations/{funding_organization.id}",
        headers={"Authorization": "test-admin-code"},
    )
    assert response.status_code == HTTPStatus.NO_CONTENT

    with pytest.raises(NoResultFound):
        async with async_session_maker() as session, session.begin():
            await session.get_one(FundingOrganization, funding_organization.id)


@pytest.mark.parametrize(
    "headers",
    [
        {"Authorization": "wrong-code"},
        {},
    ],
)
async def test_delete_organization_api_request_failure_unauthorized(
    asgi_client: SanicASGITestClient,
    funding_organization: FundingOrganization,
    headers: dict[str, str],
    mock_admin_code: Mock,
) -> None:
    _, response = await asgi_client.delete(
        f"/organizations/{funding_organization.id}",
        headers=headers,
    )
    assert response.status_code == HTTPStatus.UNAUTHORIZED
