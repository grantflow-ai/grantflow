from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

from cloud_functions.src.grant_matcher.main import (
    GrantData,
    SubscriptionData,
    _match_grants_async,
    match_grant_with_subscription,
    process_subscriptions_batch,
    should_send_notification,
)


def test_match_grant_with_subscription_category() -> None:
    grant: GrantData = {
        "id": "grant-1",
        "title": "Test Grant",
        "category": "Healthcare",
    }

    subscription: SubscriptionData = {
        "id": "sub-1",
        "email": "test@example.com",
        "search_params": {"category": "Healthcare"},
        "frequency": "daily",
        "verified": True,
    }

    assert match_grant_with_subscription(grant, subscription) is True

    subscription["search_params"]["category"] = "Education"
    assert match_grant_with_subscription(grant, subscription) is False


def test_match_grant_with_subscription_amount_range() -> None:
    grant: GrantData = {
        "id": "grant-2",
        "title": "Test Grant",
        "amount": "$50,000 - $100,000",
    }

    subscription: SubscriptionData = {
        "id": "sub-2",
        "email": "test@example.com",
        "search_params": {"min_amount": 40000, "max_amount": 120000},
        "frequency": "daily",
        "verified": True,
    }

    assert match_grant_with_subscription(grant, subscription) is True

    subscription["search_params"]["min_amount"] = 150000
    assert match_grant_with_subscription(grant, subscription) is False

    subscription["search_params"] = {"max_amount": 30000}
    assert match_grant_with_subscription(grant, subscription) is False


def test_match_grant_with_subscription_deadline() -> None:
    grant: GrantData = {
        "id": "grant-3",
        "title": "Test Grant",
        "deadline": "2024-06-15",
    }

    subscription: SubscriptionData = {
        "id": "sub-3",
        "email": "test@example.com",
        "search_params": {
            "deadline_after": "2024-06-01",
            "deadline_before": "2024-07-01",
        },
        "frequency": "daily",
        "verified": True,
    }

    assert match_grant_with_subscription(grant, subscription) is True

    subscription["search_params"]["deadline_after"] = "2024-07-01"
    assert match_grant_with_subscription(grant, subscription) is False


def test_match_grant_with_subscription_search_query() -> None:
    grant: GrantData = {
        "id": "grant-4",
        "title": "Cancer Research Grant",
        "description": "Funding for innovative cancer treatments",
    }

    subscription: SubscriptionData = {
        "id": "sub-4",
        "email": "test@example.com",
        "search_params": {"query": "cancer"},
        "frequency": "daily",
        "verified": True,
    }

    assert match_grant_with_subscription(grant, subscription) is True

    subscription["search_params"]["query"] = "diabetes"
    assert match_grant_with_subscription(grant, subscription) is False


def test_match_grant_with_subscription_multiple_criteria() -> None:
    grant: GrantData = {
        "id": "grant-5",
        "title": "Healthcare Innovation Grant",
        "category": "Healthcare",
        "amount": "$75,000",
        "deadline": "2024-12-31",
    }

    subscription: SubscriptionData = {
        "id": "sub-5",
        "email": "test@example.com",
        "search_params": {
            "query": "innovation",
            "category": "Healthcare",
            "min_amount": 50000,
            "deadline_after": "2024-01-01",
        },
        "frequency": "daily",
        "verified": True,
    }

    assert match_grant_with_subscription(grant, subscription) is True

    subscription["search_params"]["category"] = "Education"
    assert match_grant_with_subscription(grant, subscription) is False


def test_should_send_notification_first_time() -> None:
    subscription: SubscriptionData = {
        "id": "sub-6",
        "email": "test@example.com",
        "search_params": {},
        "frequency": "daily",
        "verified": True,
    }

    assert should_send_notification(subscription, "daily") is True


def test_should_send_notification_daily_frequency() -> None:
    now = datetime.now(UTC)

    subscription: SubscriptionData = {
        "id": "sub-7",
        "email": "test@example.com",
        "search_params": {},
        "frequency": "daily",
        "verified": True,
        "last_notification_sent": now - timedelta(hours=23),
    }

    assert should_send_notification(subscription, "daily") is False

    subscription["last_notification_sent"] = now - timedelta(days=1, hours=1)
    assert should_send_notification(subscription, "daily") is True


def test_should_send_notification_weekly_frequency() -> None:
    now = datetime.now(UTC)

    subscription: SubscriptionData = {
        "id": "sub-8",
        "email": "test@example.com",
        "search_params": {},
        "frequency": "weekly",
        "verified": True,
        "last_notification_sent": now - timedelta(days=6),
    }

    assert should_send_notification(subscription, "weekly") is False

    subscription["last_notification_sent"] = now - timedelta(days=7, hours=1)
    assert should_send_notification(subscription, "weekly") is True


async def test_process_subscriptions_batch_verified() -> None:
    subscription: SubscriptionData = {
        "id": str(uuid4()),
        "email": "test@example.com",
        "verified": True,
        "frequency": "daily",
        "search_params": {"category": "Healthcare"},
    }

    new_grants: list[GrantData] = [
        {"id": "grant-1", "title": "Healthcare Grant", "category": "Healthcare", "url": "https://example.com"},
        {"id": "grant-2", "title": "Education Grant", "category": "Education"},
    ]

    mock_publisher = Mock()
    mock_future = Mock()
    mock_future.result.return_value = None
    mock_publisher.publish.return_value = mock_future

    mock_session = AsyncMock()
    mock_session_context = AsyncMock()
    mock_session_context.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session_context.__aexit__ = AsyncMock(return_value=None)

    mock_begin_context = AsyncMock()
    mock_begin_context.__aenter__ = AsyncMock(return_value=mock_session)
    mock_begin_context.__aexit__ = AsyncMock(return_value=None)

    mock_session.begin = Mock(return_value=mock_begin_context)
    mock_session_maker = Mock(return_value=mock_session_context)

    notifications_sent = await process_subscriptions_batch(
        [subscription],
        new_grants,
        mock_publisher,
        "projects/test/topics/email",
        mock_session_maker,
    )

    assert notifications_sent == 1
    mock_publisher.publish.assert_called_once()
    mock_session.execute.assert_called_once()


async def test_process_subscriptions_batch_skip_unverified() -> None:
    subscription: SubscriptionData = {
        "id": str(uuid4()),
        "email": "test@example.com",
        "verified": False,
        "frequency": "daily",
        "search_params": {},
    }

    new_grants: list[GrantData] = [{"id": "grant-1", "title": "Test Grant"}]
    mock_publisher = Mock()
    mock_session_maker = Mock()

    notifications_sent = await process_subscriptions_batch(
        [subscription],
        new_grants,
        mock_publisher,
        "projects/test/topics/email",
        mock_session_maker,
    )

    assert notifications_sent == 0
    mock_publisher.publish.assert_not_called()


async def test_process_subscriptions_batch_respect_frequency() -> None:
    now = datetime.now(UTC)

    subscription: SubscriptionData = {
        "id": str(uuid4()),
        "email": "test@example.com",
        "verified": True,
        "frequency": "daily",
        "search_params": {},
        "last_notification_sent": now - timedelta(hours=12),
    }

    new_grants: list[GrantData] = [{"id": "grant-1", "title": "Test Grant"}]
    mock_publisher = Mock()
    mock_session_maker = Mock()

    notifications_sent = await process_subscriptions_batch(
        [subscription],
        new_grants,
        mock_publisher,
        "projects/test/topics/email",
        mock_session_maker,
    )

    assert notifications_sent == 0
    mock_publisher.publish.assert_not_called()


@patch("cloud_functions.src.grant_matcher.main._get_publisher_client")
@patch("cloud_functions.src.grant_matcher.main.get_session_maker")
@patch("cloud_functions.src.grant_matcher.main._fetch_new_grants")
async def test_match_grants_async_no_new_grants(
    mock_fetch_grants: AsyncMock, mock_session_maker: Mock, mock_publisher: Mock
) -> None:
    mock_fetch_grants.return_value = []

    response, status = await _match_grants_async()

    assert status == 200
    assert response["message"] == "No new grants"
    assert response["grants_processed"] == 0
    assert response["subscriptions_processed"] == 0
    assert response["notifications_sent"] == 0
    mock_fetch_grants.assert_called_once()


@patch("cloud_functions.src.grant_matcher.main._get_publisher_client")
@patch("cloud_functions.src.grant_matcher.main.get_session_maker")
@patch("cloud_functions.src.grant_matcher.main._fetch_new_grants")
@patch("cloud_functions.src.grant_matcher.main._fetch_verified_subscriptions")
@patch("cloud_functions.src.grant_matcher.main.process_subscriptions_batch")
async def test_match_grants_async_successful_processing(
    mock_process_batch: AsyncMock,
    mock_fetch_subscriptions: AsyncMock,
    mock_fetch_grants: AsyncMock,
    mock_session_maker: Mock,
    mock_publisher: Mock,
) -> None:
    mock_grants = [{"id": "grant-1", "title": "Test Grant"}]
    mock_subscriptions = [
        {"id": "sub-1", "email": "test@example.com", "verified": True, "frequency": "daily", "search_params": {}}
    ]

    mock_fetch_grants.return_value = mock_grants
    mock_fetch_subscriptions.return_value = mock_subscriptions
    mock_process_batch.return_value = 1

    response, status = await _match_grants_async()

    assert status == 200
    assert response["message"] == "Grant matching completed"
    assert response["grants_processed"] == 1
    assert response["subscriptions_processed"] == 1
    assert response["notifications_sent"] == 1

    mock_fetch_grants.assert_called_once()
    mock_fetch_subscriptions.assert_called_once()
    mock_process_batch.assert_called_once()


@patch("cloud_functions.src.grant_matcher.main._get_publisher_client")
@patch("cloud_functions.src.grant_matcher.main.get_session_maker")
@patch("cloud_functions.src.grant_matcher.main._fetch_new_grants")
@patch("cloud_functions.src.grant_matcher.main._fetch_verified_subscriptions")
async def test_match_grants_async_with_batching(
    mock_fetch_subscriptions: AsyncMock,
    mock_fetch_grants: AsyncMock,
    mock_session_maker: Mock,
    mock_publisher: Mock,
) -> None:
    mock_grants = [{"id": f"grant-{i}", "title": f"Test Grant {i}"} for i in range(5)]
    mock_subscriptions = [
        {"id": f"sub-{i}", "email": f"test{i}@example.com", "verified": True, "frequency": "daily", "search_params": {}}
        for i in range(150)
    ]

    mock_fetch_grants.return_value = mock_grants
    mock_fetch_subscriptions.return_value = mock_subscriptions

    with patch(
        "cloud_functions.src.grant_matcher.main.process_subscriptions_batch", new_callable=AsyncMock
    ) as mock_process_batch:
        mock_process_batch.return_value = 10

        response, status = await _match_grants_async()

        assert status == 200
        assert response["message"] == "Grant matching completed"
        assert response["grants_processed"] == 5
        assert response["subscriptions_processed"] == 150
        assert mock_process_batch.call_count == 2
