"""Tests for grant matcher cloud function."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import Mock, patch

import pytest

from cloud_functions.src.grant_matcher.main import (
    GrantData,
    SubscriptionData,
    match_grant_with_subscription,
    process_subscriptions_batch,
    should_send_notification,
)


class TestMatchGrantWithSubscription:
    """Tests for grant matching logic."""

    def test_match_with_category(self) -> None:
        """Test matching based on category."""
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

    def test_match_with_amount_range(self) -> None:
        """Test matching based on amount range."""
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

    def test_match_with_deadline(self) -> None:
        """Test matching based on deadline."""
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

    def test_match_with_search_query(self) -> None:
        """Test matching based on search query."""
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

    def test_match_with_multiple_criteria(self) -> None:
        """Test matching with multiple criteria."""
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

        # Change one criterion to not match
        subscription["search_params"]["category"] = "Education"
        assert match_grant_with_subscription(grant, subscription) is False


class TestShouldSendNotification:
    """Tests for notification frequency logic."""

    def test_first_notification(self) -> None:
        """Test sending first notification (no last_sent)."""
        subscription: SubscriptionData = {
            "email": "test@example.com",
            "search_params": {},
            "frequency": "daily",
            "verified": True,
        }

        assert should_send_notification(subscription, "daily") is True

    def test_daily_frequency(self) -> None:
        """Test daily notification frequency."""
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

    def test_weekly_frequency(self) -> None:
        """Test weekly notification frequency."""
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


class TestProcessSubscriptionsBatch:
    """Tests for batch subscription processing."""

    @pytest.mark.asyncio
    async def test_process_verified_subscriptions(self) -> None:
        """Test processing verified subscriptions with matching grants."""
        # Create mock subscription documents
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

        # Create grant data
        new_grants: list[tuple[str, GrantData]] = [
            ("grant-1", {"title": "Healthcare Grant", "category": "Healthcare", "url": "https://example.com"}),
            ("grant-2", {"title": "Education Grant", "category": "Education"}),
        ]

        # Create mock publisher
        mock_publisher = Mock()
        mock_future = Mock()
        mock_future.result.return_value = None
        mock_publisher.publish.return_value = mock_future

        # Create mock Firestore client
        mock_db = Mock()

        # Process subscriptions
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

    @pytest.mark.asyncio
    async def test_skip_unverified_subscriptions(self) -> None:
        """Test that unverified subscriptions are skipped."""
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

    @pytest.mark.asyncio
    async def test_respect_notification_frequency(self) -> None:
        """Test that notification frequency is respected."""
        now = datetime.now(UTC)

        mock_sub_doc = Mock()
        mock_sub_doc.id = "sub-123"
        mock_sub_doc.to_dict.return_value = {
            "email": "test@example.com",
            "verified": True,
            "frequency": "daily",
            "search_params": {},
            "last_notification_sent": now - timedelta(hours=12),  # Too recent
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


class TestMatchGrantsFunction:
    """Tests for the main cloud function."""

    @patch("cloud_functions.src.grant_matcher.main.get_publisher_client")
    @patch("cloud_functions.src.grant_matcher.main.get_firestore_client")
    def test_unauthorized_request(self, mock_firestore: Mock, mock_publisher: Mock) -> None:
        """Test rejection of unauthorized requests."""
        from cloud_functions.src.grant_matcher.main import match_grants

        mock_request = Mock()
        mock_request.headers = {}

        response, status = match_grants(mock_request)  # type: ignore[misc]

        assert status == 401
        assert response["error"] == "Unauthorized"  # type: ignore[index, call-overload]
        mock_firestore.assert_not_called()
        mock_publisher.assert_not_called()

    @patch("cloud_functions.src.grant_matcher.main.asyncio.run")
    @patch("cloud_functions.src.grant_matcher.main.get_publisher_client")
    @patch("cloud_functions.src.grant_matcher.main.get_firestore_client")
    def test_no_new_grants(
        self,
        mock_firestore: Mock,
        mock_publisher: Mock,
        mock_asyncio_run: Mock,
    ) -> None:
        """Test handling when no new grants are found."""
        from cloud_functions.src.grant_matcher.main import match_grants

        mock_request = Mock()
        mock_request.headers = {"X-CloudScheduler": "true"}

        # Mock Firestore to return no grants
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
    @patch("cloud_functions.src.grant_matcher.main.get_publisher_client")
    @patch("cloud_functions.src.grant_matcher.main.get_firestore_client")
    def test_successful_processing(
        self,
        mock_firestore: Mock,
        mock_publisher: Mock,
        mock_asyncio_run: Mock,
    ) -> None:
        """Test successful grant matching and notification sending."""
        from cloud_functions.src.grant_matcher.main import match_grants

        mock_request = Mock()
        mock_request.headers = {"X-CloudScheduler": "true"}

        # Mock grant documents
        mock_grant_doc = Mock()
        mock_grant_doc.id = "grant-1"
        mock_grant_doc.to_dict.return_value = {
            "title": "Test Grant",
            "category": "Healthcare",
            "scraped_at": datetime.now(UTC),
        }

        # Mock subscription documents
        mock_sub_doc = Mock()
        mock_sub_doc.id = "sub-1"
        mock_sub_doc.to_dict.return_value = {
            "email": "test@example.com",
            "verified": True,
            "search_params": {"category": "Healthcare"},
            "frequency": "daily",
        }

        # Setup Firestore mocks
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

        # Setup publisher mock
        mock_pub_client = Mock()
        mock_pub_client.topic_path.return_value = "projects/test/topics/email"
        mock_publisher.return_value = mock_pub_client

        # Mock async processing
        mock_asyncio_run.return_value = 1  # 1 notification sent

        response, status = match_grants(mock_request)  # type: ignore[misc]

        assert status == 200
        assert response["message"] == "Grant matching completed"  # type: ignore[index, call-overload]
        assert response["grants_processed"] == 1  # type: ignore[index, call-overload]
        assert response["subscriptions_processed"] == 1  # type: ignore[index, call-overload]
        assert response["notifications_sent"] == 1  # type: ignore[index, call-overload]
