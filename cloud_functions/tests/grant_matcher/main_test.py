from datetime import UTC, datetime, timedelta
from unittest.mock import Mock, patch

from cloud_functions.src.grant_matcher.main import (
    GrantData,
    SubscriptionData,
    match_grant_with_subscription,
    process_subscriptions_batch,
    should_send_notification,
)


def test_match_grant_with_subscription_category() -> None:
    grant: GrantData = {
        "title": "Test Grant",
        "category": "Healthcare",
    }

    subscription: SubscriptionData = {
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
        "title": "Test Grant",
        "amount": "$50,000 - $100,000",
    }

    subscription: SubscriptionData = {
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
        "title": "Test Grant",
        "deadline": "2024-06-15",
    }

    subscription: SubscriptionData = {
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
        "title": "Cancer Research Grant",
        "description": "Funding for innovative cancer treatments",
    }

    subscription: SubscriptionData = {
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
        "title": "Healthcare Innovation Grant",
        "category": "Healthcare",
        "amount": "$75,000",
        "deadline": "2024-12-31",
    }

    subscription: SubscriptionData = {
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


def testshould_send_notification_first_time() -> None:
    subscription: SubscriptionData = {
        "email": "test@example.com",
        "search_params": {},
        "frequency": "daily",
        "verified": True,
    }

    assert should_send_notification(subscription, "daily") is True


def testshould_send_notification_daily_frequency() -> None:
    now = datetime.now(UTC)

    subscription: SubscriptionData = {
        "email": "test@example.com",
        "search_params": {},
        "frequency": "daily",
        "verified": True,
        "last_notification_sent": now - timedelta(hours=23),
    }

    assert should_send_notification(subscription, "daily") is False

    subscription["last_notification_sent"] = now - timedelta(days=1, hours=1)
    assert should_send_notification(subscription, "daily") is True


def testshould_send_notification_weekly_frequency() -> None:
    now = datetime.now(UTC)

    subscription: SubscriptionData = {
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
    mock_sub_ref = Mock()
    mock_sub_ref.update = Mock()

    mock_sub_doc = Mock()
    mock_sub_doc.id = "sub-123"
    mock_sub_doc.reference = mock_sub_ref
    mock_sub_doc.to_dict.return_value = {
        "email": "test@example.com",
        "verified": True,
        "frequency": "daily",
        "search_params": {"category": "Healthcare"},
    }

    new_grants: list[tuple[str, GrantData]] = [
        ("grant-1", {"title": "Healthcare Grant", "category": "Healthcare", "url": "https://example.com"}),
        ("grant-2", {"title": "Education Grant", "category": "Education"}),
    ]

    mock_publisher = Mock()
    mock_future = Mock()
    mock_future.result.return_value = None
    mock_publisher.publish.return_value = mock_future

    mock_db = Mock()

    notifications_sent = await process_subscriptions_batch(
        [mock_sub_doc],
        new_grants,
        mock_publisher,
        "projects/test/topics/email",
        mock_db,
    )

    assert notifications_sent == 1
    mock_publisher.publish.assert_called_once()
    mock_sub_ref.update.assert_called_once()


async def test_process_subscriptions_batch_skip_unverified() -> None:
    mock_sub_doc = Mock()
    mock_sub_doc.id = "sub-123"
    mock_sub_doc.to_dict.return_value = {
        "email": "test@example.com",
        "verified": False,
        "frequency": "daily",
        "search_params": {},
    }

    new_grants: list[tuple[str, GrantData]] = [("grant-1", {"title": "Test Grant"})]
    mock_publisher = Mock()
    mock_db = Mock()

    notifications_sent = await process_subscriptions_batch(
        [mock_sub_doc],
        new_grants,
        mock_publisher,
        "projects/test/topics/email",
        mock_db,
    )

    assert notifications_sent == 0
    mock_publisher.publish.assert_not_called()


async def test_process_subscriptions_batch_respect_frequency() -> None:
    now = datetime.now(UTC)

    mock_sub_doc = Mock()
    mock_sub_doc.id = "sub-123"
    mock_sub_doc.to_dict.return_value = {
        "email": "test@example.com",
        "verified": True,
        "frequency": "daily",
        "search_params": {},
        "last_notification_sent": now - timedelta(hours=12),
    }

    new_grants: list[tuple[str, GrantData]] = [("grant-1", {"title": "Test Grant"})]
    mock_publisher = Mock()
    mock_db = Mock()

    notifications_sent = await process_subscriptions_batch(
        [mock_sub_doc],
        new_grants,
        mock_publisher,
        "projects/test/topics/email",
        mock_db,
    )

    assert notifications_sent == 0
    mock_publisher.publish.assert_not_called()


@patch("cloud_functions.src.grant_matcher.main._get_publisher_client")
@patch("cloud_functions.src.grant_matcher.main._get_firestore_client")
def test_match_grants_cron_request(mock_firestore: Mock, mock_publisher: Mock) -> None:
    from cloud_functions.src.grant_matcher.main import match_grants

    mock_db = Mock()
    mock_firestore.return_value = mock_db

    grants_collection = Mock()
    mock_db.collection.return_value = grants_collection
    grants_query = Mock()
    grants_collection.where.return_value = grants_query
    grants_query.stream.return_value = []

    mock_request = Mock()
    mock_request.headers = {}

    response, status = match_grants(mock_request)  # type: ignore[misc]

    assert status == 200
    assert response["message"] == "No new grants"  # type: ignore[index, call-overload]
    assert response["grants_processed"] == 0  # type: ignore[index, call-overload]


@patch("cloud_functions.src.grant_matcher.main.asyncio.run")
@patch("cloud_functions.src.grant_matcher.main._get_publisher_client")
@patch("cloud_functions.src.grant_matcher.main._get_firestore_client")
def test_match_grants_no_new_grants(
    mock_firestore: Mock,
    mock_publisher: Mock,
    mock_asyncio_run: Mock,
) -> None:
    from cloud_functions.src.grant_matcher.main import match_grants

    mock_request = Mock()
    mock_request.headers = {}

    mock_db = Mock()
    mock_grants_collection = Mock()
    mock_grants_query = Mock()
    mock_grants_query.stream.return_value = []
    mock_grants_collection.where.return_value = mock_grants_query
    mock_db.collection.return_value = mock_grants_collection
    mock_firestore.return_value = mock_db

    response, status = match_grants(mock_request)  # type: ignore[misc]

    assert status == 200
    assert response["message"] == "No new grants"  # type: ignore[index, call-overload]
    assert response["notifications_sent"] == 0  # type: ignore[index, call-overload]


@patch("cloud_functions.src.grant_matcher.main.asyncio.run")
@patch("cloud_functions.src.grant_matcher.main._get_publisher_client")
@patch("cloud_functions.src.grant_matcher.main._get_firestore_client")
def test_match_grants_successful_processing(
    mock_firestore: Mock,
    mock_publisher: Mock,
    mock_asyncio_run: Mock,
) -> None:
    from cloud_functions.src.grant_matcher.main import match_grants

    mock_request = Mock()
    mock_request.headers = {}

    mock_grant_doc = Mock()
    mock_grant_doc.id = "grant-1"
    mock_grant_doc.to_dict.return_value = {
        "title": "Test Grant",
        "category": "Healthcare",
        "scraped_at": datetime.now(UTC),
    }

    mock_sub_doc = Mock()
    mock_sub_doc.id = "sub-1"
    mock_sub_doc.to_dict.return_value = {
        "email": "test@example.com",
        "verified": True,
        "search_params": {"category": "Healthcare"},
        "frequency": "daily",
    }

    mock_db = Mock()

    mock_grants_collection = Mock()
    mock_grants_query = Mock()
    mock_grants_query.stream.return_value = [mock_grant_doc]
    mock_grants_collection.where.return_value = mock_grants_query

    mock_subs_collection = Mock()
    mock_subs_query = Mock()
    mock_subs_query.stream.return_value = [mock_sub_doc]
    mock_subs_collection.where.return_value = mock_subs_query

    def collection_side_effect(name: str) -> Mock:
        if name == "grants":
            return mock_grants_collection
        if name == "subscriptions":
            return mock_subs_collection
        return Mock()

    mock_db.collection.side_effect = collection_side_effect
    mock_firestore.return_value = mock_db

    mock_pub_client = Mock()
    mock_pub_client.topic_path.return_value = "projects/test/topics/email"
    mock_publisher.return_value = mock_pub_client

    mock_asyncio_run.return_value = 1

    response, status = match_grants(mock_request)  # type: ignore[misc]

    assert status == 200
    assert response["message"] == "Grant matching completed"  # type: ignore[index, call-overload]
    assert response["grants_processed"] == 1  # type: ignore[index, call-overload]
    assert response["subscriptions_processed"] == 1  # type: ignore[index, call-overload]
    assert response["notifications_sent"] == 1  # type: ignore[index, call-overload]
