from collections.abc import AsyncIterator, Generator
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from litestar import Litestar
from litestar.di import Provide
from litestar.status_codes import HTTP_201_CREATED, HTTP_401_UNAUTHORIZED
from litestar.testing import AsyncTestClient
from packages.db.src.tables import Grant, GrantingInstitution, GrantMatchingSubscription
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
def mock_send_grant_alert_email() -> Generator[AsyncMock]:
    with patch(
        "services.backend.src.api.webhooks.grant_matcher.send_grant_alert_email", new_callable=AsyncMock
    ) as mock:
        yield mock


@pytest.fixture
async def grant_matcher_test_client(
    async_session_maker: async_sessionmaker[Any],
) -> AsyncIterator[AsyncTestClient[Any]]:
    from services.backend.src.api.middleware import AuthMiddleware
    from services.backend.src.api.routes.grants import handle_create_subscription
    from services.backend.src.api.webhooks.grant_matcher import handle_grant_matcher_webhook

    def provide_session_maker() -> async_sessionmaker[Any]:
        return async_session_maker

    app = Litestar(
        route_handlers=[
            handle_grant_matcher_webhook,
            handle_create_subscription,
        ],
        middleware=[AuthMiddleware],
        debug=True,
        dependencies={"session_maker": Provide(provide_session_maker, sync_to_thread=False)},
    )

    async with AsyncTestClient(app=app, raise_server_exceptions=False) as client:
        with patch("services.backend.src.api.middleware.get_env") as mock_get_env:
            mock_get_env.return_value = "test-webhook-token"
            yield client


@pytest.fixture
async def granting_institution(
    async_session_maker: async_sessionmaker[Any],
) -> GrantingInstitution:
    async with async_session_maker() as session:
        institution = GrantingInstitution(
            id=uuid4(),
            full_name=f"National Science Foundation {uuid4().hex[:8]}",
            abbreviation="NSF",
        )
        session.add(institution)
        await session.commit()
        return institution


@pytest.fixture
async def sample_grant(
    async_session_maker: async_sessionmaker[Any],
    granting_institution: GrantingInstitution,
) -> Grant:
    async with async_session_maker() as session:
        grant = Grant(
            id=uuid4(),
            granting_institution_id=granting_institution.id,
            title="Research Grant for AI Development",
            description="A comprehensive grant for advancing AI research and applications",
            url="https://example.com/grants/ai-research",
            release_date="2025-01-01",
            expired_date="2025-12-31",
            activity_code="R01",
            organization="National Science Foundation",
            parent_organization="NSF",
            participating_orgs="Academic institutions",
            document_number="NSF-AI-2025-001",
            document_type="Research Grant",
            clinical_trials="No",
            amount="$50,000 - $250,000",
            amount_min=50000,
            amount_max=250000,
            category="Research",
            eligibility="Academic institutions and non-profits",
            created_at=datetime.now(UTC) - timedelta(hours=1),
        )
        session.add(grant)
        await session.commit()
        return grant


@pytest.fixture
async def sample_subscriptions(
    async_session_maker: async_sessionmaker[Any],
) -> list[GrantMatchingSubscription]:
    async with async_session_maker() as session:
        subscriptions = [
            GrantMatchingSubscription(
                id=uuid4(),
                email="research@university.edu",
                search_params={"category": "Research", "min_amount": 50000},
                frequency="daily",
                unsubscribed=False,
                last_notification_sent=None,
            ),
            GrantMatchingSubscription(
                id=uuid4(),
                email="clinical@hospital.org",
                search_params={"category": "Clinical"},
                frequency="daily",
                unsubscribed=False,
                last_notification_sent=None,
            ),
            GrantMatchingSubscription(
                id=uuid4(),
                email="unverified@example.com",
                search_params={"category": "Research"},
                frequency="daily",
                unsubscribed=False,
                last_notification_sent=None,
            ),
            GrantMatchingSubscription(
                id=uuid4(),
                email="weekly@example.com",
                search_params={"category": "Research"},
                frequency="weekly",
                unsubscribed=False,
                last_notification_sent=datetime.now(UTC) - timedelta(days=8),
            ),
        ]
        for sub in subscriptions:
            session.add(sub)
        await session.commit()
        return subscriptions


async def test_grant_matcher_webhook_unauthorized(
    grant_matcher_test_client: AsyncTestClient[Any],
) -> None:
    response = await grant_matcher_test_client.post(
        "/webhooks/scheduler/grant-matcher",
        headers={"Authorization": "wrong-token"},
    )
    assert response.status_code == HTTP_401_UNAUTHORIZED


async def test_grant_matcher_webhook_with_matches(
    grant_matcher_test_client: AsyncTestClient[Any],
    sample_grant: Grant,
    sample_subscriptions: list[GrantMatchingSubscription],
    mock_send_grant_alert_email: AsyncMock,
) -> None:
    response = await grant_matcher_test_client.post(
        "/webhooks/scheduler/grant-matcher",
        headers={"Authorization": "test-webhook-token"},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "success"
    assert data["grants_processed"] == 1
    assert data["subscriptions_processed"] == 4
    assert data["notifications_sent"] == 3

    assert mock_send_grant_alert_email.call_count == 3

    call_args_list = [call.kwargs["email"] for call in mock_send_grant_alert_email.call_args_list]
    assert "research@university.edu" in call_args_list
    assert "weekly@example.com" in call_args_list
    assert "unverified@example.com" in call_args_list
    assert "clinical@hospital.org" not in call_args_list


async def test_grant_matcher_webhook_no_new_grants(
    grant_matcher_test_client: AsyncTestClient[Any],
    mock_send_grant_alert_email: AsyncMock,
) -> None:
    response = await grant_matcher_test_client.post(
        "/webhooks/scheduler/grant-matcher",
        headers={"Authorization": "test-webhook-token"},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "success"
    assert data["message"] == "No new grants to process"
    assert data["grants_processed"] == 0
    assert data["subscriptions_processed"] == 0
    assert data["notifications_sent"] == 0

    mock_send_grant_alert_email.assert_not_called()


async def test_grant_matcher_webhook_old_grant(
    grant_matcher_test_client: AsyncTestClient[Any],
    async_session_maker: async_sessionmaker[Any],
    granting_institution: GrantingInstitution,
    sample_subscriptions: list[GrantMatchingSubscription],
    mock_send_grant_alert_email: AsyncMock,
) -> None:
    async with async_session_maker() as session:
        old_grant = Grant(
            id=uuid4(),
            granting_institution_id=granting_institution.id,
            title="Old Grant",
            description="This grant was created more than 24 hours ago",
            url="https://example.com/old-grant",
            release_date="2023-01-01",
            expired_date="2025-12-31",
            activity_code="R01",
            organization="National Science Foundation",
            parent_organization="NSF",
            participating_orgs="Academic institutions",
            document_number="NSF-OLD-2023-001",
            document_type="Research Grant",
            clinical_trials="No",
            amount="$100,000",
            category="Research",
            created_at=datetime.now(UTC) - timedelta(days=2),
        )
        session.add(old_grant)
        await session.commit()

    response = await grant_matcher_test_client.post(
        "/webhooks/scheduler/grant-matcher",
        headers={"Authorization": "test-webhook-token"},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "success"
    assert data["message"] == "No new grants to process"
    assert data["grants_processed"] == 0

    mock_send_grant_alert_email.assert_not_called()


async def test_grant_matcher_webhook_frequency_filtering(
    grant_matcher_test_client: AsyncTestClient[Any],
    sample_grant: Grant,
    async_session_maker: async_sessionmaker[Any],
    mock_send_grant_alert_email: AsyncMock,
) -> None:
    async with async_session_maker() as session:
        recent_sub = GrantMatchingSubscription(
            id=uuid4(),
            email="recent@example.com",
            search_params={"category": "Research"},
            frequency="daily",
            unsubscribed=False,
            last_notification_sent=datetime.now(UTC) - timedelta(hours=12),
        )
        session.add(recent_sub)
        await session.commit()

    response = await grant_matcher_test_client.post(
        "/webhooks/scheduler/grant-matcher",
        headers={"Authorization": "test-webhook-token"},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "success"
    assert data["subscriptions_processed"] == 1
    assert data["notifications_sent"] == 0

    mock_send_grant_alert_email.assert_not_called()


async def test_grant_matcher_webhook_email_failure(
    grant_matcher_test_client: AsyncTestClient[Any],
    sample_grant: Grant,
    sample_subscriptions: list[GrantMatchingSubscription],
    mock_send_grant_alert_email: AsyncMock,
) -> None:
    mock_send_grant_alert_email.side_effect = Exception("Email service error")

    response = await grant_matcher_test_client.post(
        "/webhooks/scheduler/grant-matcher",
        headers={"Authorization": "test-webhook-token"},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "success"
    assert data["grants_processed"] == 1
    assert data["subscriptions_processed"] == 4
    assert data["notifications_sent"] == 0
