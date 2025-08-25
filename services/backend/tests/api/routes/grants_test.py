from collections.abc import AsyncIterator
from typing import Any

import pytest
from litestar import Litestar
from litestar.di import Provide
from litestar.status_codes import (
    HTTP_200_OK,
    HTTP_404_NOT_FOUND,
)
from litestar.testing import AsyncTestClient
from packages.db.src.tables import Grant, GrantingInstitution
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
async def public_test_client(async_session_maker: async_sessionmaker[Any]) -> AsyncIterator[AsyncTestClient[Any]]:
    from services.backend.src.api.routes.grants import (
        get_grant_details,
        search_grants,
    )

    def provide_session_maker() -> async_sessionmaker[Any]:
        return async_session_maker

    app = Litestar(
        route_handlers=[
            search_grants,
            get_grant_details,
        ],
        debug=True,
        dependencies={"session_maker": Provide(provide_session_maker, sync_to_thread=False)},
    )

    async with AsyncTestClient(app=app, raise_server_exceptions=False) as client:
        yield client


@pytest.fixture
async def sample_grants(
    async_session_maker: async_sessionmaker[Any],
) -> list[Grant]:
    async with async_session_maker() as session:
        institution = GrantingInstitution(
            full_name="Test Institution",
            abbreviation="TI",
        )
        session.add(institution)
        await session.flush()

        grants_data = [
            {
                "granting_institution_id": institution.id,
                "title": "Test Grant 0",
                "description": "Description for test grant 0",
                "release_date": "2024-01-01",
                "expired_date": "2024-12-31",
                "activity_code": "R01",
                "organization": "NIH",
                "parent_organization": "Department of Health and Human Services",
                "participating_orgs": "Multiple institutions",
                "document_number": "PA-24-000",
                "document_type": "Program Announcement",
                "clinical_trials": "Yes",
                "url": "https://grants.nih.gov/grants/guide/pa-files/PA-24-000",
                "amount": "$100,000 - $500,000",
                "amount_min": 100000,
                "amount_max": 500000,
                "category": "Research",
                "eligibility": "Academic institutions",
            },
            {
                "granting_institution_id": institution.id,
                "title": "Test Grant 1",
                "description": "Description for test grant 1",
                "release_date": "2024-01-02",
                "expired_date": "2024-12-31",
                "activity_code": "R21",
                "organization": "NIH",
                "parent_organization": "Department of Health and Human Services",
                "participating_orgs": "Single institution",
                "document_number": "PA-24-001",
                "document_type": "Program Announcement",
                "clinical_trials": "No",
                "url": "https://grants.nih.gov/grants/guide/pa-files/PA-24-001",
                "amount": "$50,000 - $200,000",
                "amount_min": 50000,
                "amount_max": 200000,
                "category": "Clinical",
                "eligibility": "Medical Centers",
            },
            {
                "granting_institution_id": institution.id,
                "title": "Special Research Grant",
                "description": "A special grant for research purposes with advanced methodologies",
                "release_date": "2024-01-03",
                "expired_date": "2024-12-31",
                "activity_code": "R03",
                "organization": "NIH",
                "parent_organization": "Department of Health and Human Services",
                "participating_orgs": "Research networks",
                "document_number": "PA-24-002",
                "document_type": "Program Announcement",
                "clinical_trials": "Optional",
                "url": "https://grants.nih.gov/grants/guide/pa-files/PA-24-002",
                "amount": "$75,000 - $300,000",
                "amount_min": 75000,
                "amount_max": 300000,
                "category": "Research",
                "eligibility": "Universities and research institutes",
            },
        ]

        grants = []
        for grant_data in grants_data:
            grant = Grant(**grant_data)
            session.add(grant)
            grants.append(grant)

        await session.commit()

        for grant in grants:
            await session.refresh(grant)

        return grants


async def test_search_grants_no_filters(public_test_client: AsyncTestClient[Any], sample_grants: list[Grant]) -> None:
    response = await public_test_client.get("/grants")

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 3
    assert data[0]["title"] in ["Test Grant 0", "Test Grant 1", "Special Research Grant"]
    assert data[0]["document_number"] in ["PA-24-000", "PA-24-001", "PA-24-002"]


async def test_search_grants_with_query_title_match(
    public_test_client: AsyncTestClient[Any], sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"search_query": "Special"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Special Research Grant"
    assert data[0]["document_number"] == "PA-24-002"


async def test_search_grants_with_query_description_match(
    public_test_client: AsyncTestClient[Any], sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"search_query": "methodologies"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Special Research Grant"


async def test_search_grants_with_category_filter(
    public_test_client: AsyncTestClient[Any], sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"category": "Clinical"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test Grant 1"
    assert data[0]["category"] == "Clinical"


async def test_search_grants_with_amount_filters(
    public_test_client: AsyncTestClient[Any], sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"min_amount": 50000, "max_amount": 200000})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test Grant 1"


async def test_search_grants_with_pagination(
    public_test_client: AsyncTestClient[Any], sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"limit": 1, "offset": 1})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1


async def test_get_grant_details_success(public_test_client: AsyncTestClient[Any], sample_grants: list[Grant]) -> None:
    response = await public_test_client.get("/grants/PA-24-000")

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert data["document_number"] == "PA-24-000"
    assert data["title"] == "Test Grant 0"
    assert data["description"] == "Description for test grant 0"
    assert data["deadline"] is None


async def test_get_grant_details_not_found(
    public_test_client: AsyncTestClient[Any], sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants/NONEXISTENT")

    assert response.status_code == HTTP_404_NOT_FOUND
    data = response.json()
    assert data["error"] == "Grant not found"


async def test_search_grants_limit_enforcement(
    public_test_client: AsyncTestClient[Any], sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"limit": 200})

    assert response.status_code == HTTP_200_OK


async def test_search_grants_no_results(public_test_client: AsyncTestClient[Any], sample_grants: list[Grant]) -> None:
    response = await public_test_client.get("/grants", params={"search_query": "nonexistent-search-term"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 0


async def test_search_grants_organization_match(
    public_test_client: AsyncTestClient[Any], sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"search_query": "NIH"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 3
    for grant in data:
        assert grant["organization"] == "NIH"


async def test_search_grants_document_number_match(
    public_test_client: AsyncTestClient[Any], sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"search_query": "PA-24-001"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["document_number"] == "PA-24-001"
    assert data[0]["title"] == "Test Grant 1"
