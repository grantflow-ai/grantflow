from collections.abc import AsyncIterator
from typing import Any

import pytest
from litestar import Litestar
from litestar.di import Provide
from litestar.status_codes import (
    HTTP_200_OK,
    HTTP_201_CREATED,
    HTTP_404_NOT_FOUND,
)
from litestar.testing import AsyncTestClient
from packages.db.src.tables import Grant, GrantingInstitution, GrantMatchingSubscription
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


@pytest.fixture
async def public_test_client(async_session_maker: async_sessionmaker[Any]) -> AsyncIterator[AsyncTestClient[Any]]:
    from services.backend.src.api.routes.grants import (
        handle_get_grant_details,
        handle_search_grants,
    )

    def provide_session_maker() -> async_sessionmaker[Any]:
        return async_session_maker

    app = Litestar(
        route_handlers=[
            handle_search_grants,
            handle_get_grant_details,
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


async def test_search_grants_no_filters(public_test_client: TestingClientType, sample_grants: list[Grant]) -> None:
    response = await public_test_client.get("/grants")

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 3
    assert data[0]["title"] in ["Test Grant 0", "Test Grant 1", "Special Research Grant"]
    assert data[0]["document_number"] in ["PA-24-000", "PA-24-001", "PA-24-002"]


async def test_search_grants_with_query_title_match(
    public_test_client: TestingClientType, sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"search_query": "Special"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Special Research Grant"
    assert data[0]["document_number"] == "PA-24-002"


async def test_search_grants_with_query_description_match(
    public_test_client: TestingClientType, sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"search_query": "methodologies"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Special Research Grant"


async def test_search_grants_with_category_filter(
    public_test_client: TestingClientType, sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"category": "Clinical"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test Grant 1"
    assert data[0]["category"] == "Clinical"


async def test_search_grants_with_amount_filters(
    public_test_client: TestingClientType, sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"min_amount": 50000, "max_amount": 200000})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Test Grant 1"


async def test_search_grants_with_pagination(public_test_client: TestingClientType, sample_grants: list[Grant]) -> None:
    response = await public_test_client.get("/grants", params={"limit": 1, "offset": 1})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1


async def test_get_grant_details_success(public_test_client: TestingClientType, sample_grants: list[Grant]) -> None:
    response = await public_test_client.get("/grants/PA-24-000")

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert data["document_number"] == "PA-24-000"
    assert data["title"] == "Test Grant 0"
    assert data["description"] == "Description for test grant 0"
    assert data["deadline"] is None


async def test_get_grant_details_not_found(public_test_client: TestingClientType, sample_grants: list[Grant]) -> None:
    response = await public_test_client.get("/grants/NONEXISTENT")

    assert response.status_code == HTTP_404_NOT_FOUND
    data = response.json()
    assert data["detail"] == "Grant not found"


async def test_search_grants_limit_enforcement(
    public_test_client: TestingClientType, sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"limit": 200})

    assert response.status_code == HTTP_200_OK


async def test_search_grants_no_results(public_test_client: TestingClientType, sample_grants: list[Grant]) -> None:
    response = await public_test_client.get("/grants", params={"search_query": "nonexistent-search-term"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 0


async def test_search_grants_organization_match(
    public_test_client: TestingClientType, sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"search_query": "NIH"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 3
    for grant in data:
        assert grant["organization"] == "NIH"


async def test_search_grants_document_number_match(
    public_test_client: TestingClientType, sample_grants: list[Grant]
) -> None:
    response = await public_test_client.get("/grants", params={"search_query": "PA-24-001"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["document_number"] == "PA-24-001"
    assert data[0]["title"] == "Test Grant 1"


async def test_create_subscription_success(test_client: TestingClientType) -> None:
    response = await test_client.post(
        "/grants/subscribe",
        json={
            "email": "grants-test@example.com",
            "frequency": "daily",
            "search_params": {"category": "Research", "min_amount": 10000},
        },
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["message"] == "Subscription created successfully."
    assert "id" in data


async def test_create_subscription_duplicate_email(
    test_client: TestingClientType, async_session_maker: async_sessionmaker[Any]
) -> None:
    async with async_session_maker() as session:
        subscription = GrantMatchingSubscription(
            email="grants-duplicate@example.com", search_params={"category": "Research"}, frequency="weekly"
        )
        session.add(subscription)
        await session.commit()

    response = await test_client.post(
        "/grants/subscribe",
        json={"email": "grants-duplicate@example.com", "frequency": "daily", "search_params": {"category": "Health"}},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["message"] == "Subscription created successfully."
    assert "id" in data


async def test_create_subscription_invalid_email(test_client: TestingClientType) -> None:
    response = await test_client.post(
        "/grants/subscribe",
        json={"email": "invalid-email-format", "frequency": "daily", "search_params": {"category": "Research"}},
    )

    assert response.status_code == HTTP_201_CREATED


async def test_search_grants_excludes_soft_deleted(
    public_test_client: TestingClientType, sample_grants: list[Grant], async_session_maker: async_sessionmaker[Any]
) -> None:
    response = await public_test_client.get("/grants")
    assert response.status_code == HTTP_200_OK
    initial_data = response.json()
    assert len(initial_data) == 3

    async with async_session_maker() as session:
        grant_to_delete = sample_grants[0]
        grant_to_delete.soft_delete()
        session.add(grant_to_delete)
        await session.commit()

    response = await public_test_client.get("/grants")
    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 2

    returned_document_numbers = {grant["document_number"] for grant in data}
    assert grant_to_delete.document_number not in returned_document_numbers


async def test_get_grant_details_excludes_soft_deleted(
    public_test_client: TestingClientType, sample_grants: list[Grant], async_session_maker: async_sessionmaker[Any]
) -> None:
    grant_to_delete = sample_grants[0]

    response = await public_test_client.get(f"/grants/{grant_to_delete.document_number}")
    assert response.status_code == HTTP_200_OK

    async with async_session_maker() as session:
        grant_to_delete.soft_delete()
        session.add(grant_to_delete)
        await session.commit()

    response = await public_test_client.get(f"/grants/{grant_to_delete.document_number}")
    assert response.status_code == HTTP_404_NOT_FOUND
    data = response.json()
    assert data["detail"] == "Grant not found"


async def test_search_with_filters_excludes_soft_deleted(
    public_test_client: TestingClientType, sample_grants: list[Grant], async_session_maker: async_sessionmaker[Any]
) -> None:
    response = await public_test_client.get("/grants", params={"category": "Research"})
    assert response.status_code == HTTP_200_OK
    initial_data = response.json()
    research_grant_count = len(initial_data)
    assert research_grant_count > 0

    research_grant = next((grant for grant in sample_grants if grant.category == "Research"), None)
    assert research_grant is not None

    async with async_session_maker() as session:
        research_grant.soft_delete()
        session.add(research_grant)
        await session.commit()

    response = await public_test_client.get("/grants", params={"category": "Research"})
    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == research_grant_count - 1

    returned_document_numbers = {grant["document_number"] for grant in data}
    assert research_grant.document_number not in returned_document_numbers


async def test_subscription_excludes_soft_deleted_grants(
    test_client: TestingClientType, async_session_maker: async_sessionmaker[Any]
) -> None:
    response = await test_client.post(
        "/grants/subscribe",
        json={
            "email": "grants-soft-delete@example.com",
            "frequency": "daily",
            "search_params": {"category": "Research"},
        },
    )
    assert response.status_code == HTTP_201_CREATED

    async with async_session_maker() as session:
        subscription = await session.scalar(
            select(GrantMatchingSubscription).where(GrantMatchingSubscription.email == "grants-soft-delete@example.com")
        )
        assert subscription is not None
        subscription.soft_delete()
        session.add(subscription)
        await session.commit()

    response = await test_client.post("/grants/unsubscribe", json={"email": "grants-soft-delete@example.com"})
    assert response.status_code == HTTP_404_NOT_FOUND
    data = response.json()
    assert "No active subscription found" in data["detail"]


async def test_unsubscribe_success(
    test_client: TestingClientType, async_session_maker: async_sessionmaker[Any]
) -> None:
    async with async_session_maker() as session:
        subscription = GrantMatchingSubscription(
            email="grants-unsubscribe@example.com", search_params={"category": "Research"}, frequency="weekly"
        )
        session.add(subscription)
        await session.commit()

    response = await test_client.post("/grants/unsubscribe", json={"email": "grants-unsubscribe@example.com"})

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["message"] == "Successfully unsubscribed from grant notifications"


async def test_unsubscribe_nonexistent_email(test_client: TestingClientType) -> None:
    response = await test_client.post("/grants/unsubscribe", json={"email": "grants-nonexistent@example.com"})

    assert response.status_code == HTTP_404_NOT_FOUND
    data = response.json()
    assert "No active subscription found" in data["detail"]


async def test_unsubscribe_invalid_email(test_client: TestingClientType) -> None:
    response = await test_client.post("/grants/unsubscribe", json={"email": "invalid-email"})

    assert response.status_code == HTTP_404_NOT_FOUND


async def test_create_subscription_edge_cases(test_client: TestingClientType) -> None:
    response = await test_client.post(
        "/grants/subscribe", json={"email": "grants-minimal@example.com", "frequency": "monthly", "search_params": {}}
    )

    assert response.status_code == HTTP_201_CREATED

    response = await test_client.post(
        "/grants/subscribe",
        json={
            "email": "grants-maximal@example.com",
            "frequency": "daily",
            "search_params": {
                "search_query": "AI research",
                "category": "Technology",
                "min_amount": 50000,
                "max_amount": 500000,
                "deadline_after": "2025-01-01",
                "deadline_before": "2025-12-31",
            },
        },
    )

    assert response.status_code == HTTP_201_CREATED
