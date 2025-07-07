from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from packages.shared_utils.src.exceptions import ExternalOperationError

from services.backend.src.utils.firebase import (
    cancel_user_deletion,
    get_user_deletion_status,
    schedule_user_deletion,
)


@pytest.fixture
def mock_firestore_client(mocker: Any) -> dict[str, Any]:
    """Mock Firestore client with collection and document methods."""
    mock_client = MagicMock()
    mock_collection = MagicMock()
    mock_doc = MagicMock()

    mock_client.collection.return_value = mock_collection
    mock_collection.document.return_value = mock_doc

    mock_doc.set = AsyncMock()
    mock_doc.get = AsyncMock()
    mock_doc.update = AsyncMock()

    mocker.patch(
        "services.backend.src.utils.firebase.get_firestore_client",
        return_value=mock_client,
    )

    return {
        "client": mock_client,
        "collection": mock_collection,
        "document": mock_doc,
    }


class TestScheduleUserDeletion:
    async def test_schedule_user_deletion_success(self, mock_firestore_client: dict[str, Any]) -> None:
        """Test successful user deletion scheduling."""
        uid = "test-firebase-uid-123"
        grace_period_days = 30

        result = await schedule_user_deletion(uid, grace_period_days)

        assert result["firebase_uid"] == uid
        assert result["status"] == "scheduled"
        assert result["grace_period_days"] == grace_period_days
        assert "deletion_date" in result
        assert "scheduled_at" in result
        assert "created_at" in result
        assert "updated_at" in result

        deletion_date = result["deletion_date"]
        expected_date = datetime.now(UTC) + timedelta(days=grace_period_days)
        time_diff = abs((deletion_date - expected_date).total_seconds())
        assert time_diff < 60

        mock_firestore_client["client"].collection.assert_called_once_with("user-deletion-requests")
        mock_firestore_client["document"].set.assert_called_once()

    async def test_schedule_user_deletion_custom_grace_period(self, mock_firestore_client: dict[str, Any]) -> None:
        """Test scheduling with custom grace period."""
        uid = "test-firebase-uid-456"
        grace_period_days = 7

        result = await schedule_user_deletion(uid, grace_period_days)

        assert result["grace_period_days"] == 7

        deletion_date = result["deletion_date"]
        expected_date = datetime.now(UTC) + timedelta(days=7)
        time_diff = abs((deletion_date - expected_date).total_seconds())
        assert time_diff < 60

    async def test_schedule_user_deletion_firestore_error(self, mock_firestore_client: dict[str, Any]) -> None:
        """Test handling of Firestore errors during scheduling."""
        uid = "test-firebase-uid-error"

        mock_firestore_client["document"].set.side_effect = Exception("Firestore error")

        with pytest.raises(ExternalOperationError, match="Error scheduling user deletion"):
            await schedule_user_deletion(uid, 30)

    async def test_schedule_user_deletion_zero_grace_period(self, mock_firestore_client: dict[str, Any]) -> None:
        """Test scheduling with zero grace period (immediate deletion)."""
        uid = "test-firebase-uid-immediate"
        grace_period_days = 0

        result = await schedule_user_deletion(uid, grace_period_days)

        assert result["grace_period_days"] == 0

        deletion_date = result["deletion_date"]
        now = datetime.now(UTC)
        time_diff = abs((deletion_date - now).total_seconds())
        assert time_diff < 60


class TestGetUserDeletionStatus:
    async def test_get_user_deletion_status_found(self, mock_firestore_client: dict[str, Any]) -> None:
        """Test retrieving existing deletion status."""
        uid = "test-firebase-uid-existing"

        mock_doc_snapshot = MagicMock()
        mock_doc_snapshot.exists = True
        mock_doc_snapshot.to_dict.return_value = {
            "firebase_uid": uid,
            "status": "scheduled",
            "grace_period_days": 30,
            "deletion_date": datetime.now(UTC) + timedelta(days=30),
            "created_at": datetime.now(UTC),
        }

        mock_firestore_client["document"].get.return_value = mock_doc_snapshot

        result = await get_user_deletion_status(uid)

        assert result is not None
        assert result["firebase_uid"] == uid
        assert result["status"] == "scheduled"
        assert result["grace_period_days"] == 30

        mock_firestore_client["client"].collection.assert_called_once_with("user-deletion-requests")
        mock_firestore_client["collection"].document.assert_called_once_with(uid)
        mock_firestore_client["document"].get.assert_called_once()

    async def test_get_user_deletion_status_not_found(self, mock_firestore_client: dict[str, Any]) -> None:
        """Test retrieving non-existent deletion status."""
        uid = "test-firebase-uid-nonexistent"

        mock_doc_snapshot = MagicMock()
        mock_doc_snapshot.exists = False

        mock_firestore_client["document"].get.return_value = mock_doc_snapshot

        result = await get_user_deletion_status(uid)

        assert result is None

    async def test_get_user_deletion_status_firestore_error(self, mock_firestore_client: dict[str, Any]) -> None:
        """Test handling of Firestore errors during status retrieval."""
        uid = "test-firebase-uid-error"

        mock_firestore_client["document"].get.side_effect = Exception("Firestore query error")

        with pytest.raises(ExternalOperationError, match="Error getting user deletion status"):
            await get_user_deletion_status(uid)


class TestCancelUserDeletion:
    async def test_cancel_user_deletion_success(self, mock_firestore_client: dict[str, Any]) -> None:
        """Test successful deletion cancellation."""
        uid = "test-firebase-uid-cancel"

        mock_doc_snapshot = MagicMock()
        mock_doc_snapshot.exists = True

        mock_doc_ref = MagicMock()
        mock_doc_ref.get = AsyncMock(return_value=mock_doc_snapshot)
        mock_doc_ref.update = AsyncMock()

        mock_firestore_client["collection"].document.return_value = mock_doc_ref

        result = await cancel_user_deletion(uid)

        assert result is True

        mock_firestore_client["client"].collection.assert_called_once_with("user-deletion-requests")
        mock_firestore_client["collection"].document.assert_called_once_with(uid)
        mock_doc_ref.get.assert_called_once()
        mock_doc_ref.update.assert_called_once()

    async def test_cancel_user_deletion_not_found(self, mock_firestore_client: dict[str, Any]) -> None:
        """Test cancellation when no deletion request exists."""
        uid = "test-firebase-uid-no-deletion"

        mock_doc_snapshot = MagicMock()
        mock_doc_snapshot.exists = False

        mock_doc_ref = MagicMock()
        mock_doc_ref.get = AsyncMock(return_value=mock_doc_snapshot)

        mock_firestore_client["collection"].document.return_value = mock_doc_ref

        result = await cancel_user_deletion(uid)

        assert result is False

    async def test_cancel_user_deletion_firestore_error(self, mock_firestore_client: dict[str, Any]) -> None:
        """Test handling of Firestore errors during cancellation."""
        uid = "test-firebase-uid-cancel-error"

        mock_doc_ref = MagicMock()
        mock_doc_ref.get = AsyncMock(side_effect=Exception("Firestore cancel error"))

        mock_firestore_client["collection"].document.return_value = mock_doc_ref

        with pytest.raises(ExternalOperationError, match="Error cancelling user deletion"):
            await cancel_user_deletion(uid)

    async def test_cancel_user_deletion_update_error(self, mock_firestore_client: dict[str, Any]) -> None:
        """Test handling of Firestore errors during update."""
        uid = "test-firebase-uid-update-error"

        mock_doc_snapshot = MagicMock()
        mock_doc_snapshot.exists = True

        mock_doc_ref = MagicMock()
        mock_doc_ref.get = AsyncMock(return_value=mock_doc_snapshot)
        mock_doc_ref.update = AsyncMock(side_effect=Exception("Update failed"))

        mock_firestore_client["collection"].document.return_value = mock_doc_ref

        with pytest.raises(ExternalOperationError, match="Error cancelling user deletion"):
            await cancel_user_deletion(uid)
