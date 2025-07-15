from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from packages.shared_utils.src.exceptions import ExternalOperationError

from services.backend.src.utils.firebase import (
    cancel_user_deletion,
    get_user,
    get_user_deletion_status,
    get_users,
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


async def test_schedule_user_deletion_success(mock_firestore_client: dict[str, Any]) -> None:
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


async def test_schedule_user_deletion_custom_grace_period(mock_firestore_client: dict[str, Any]) -> None:
    """Test scheduling with custom grace period."""
    uid = "test-firebase-uid-456"
    grace_period_days = 7

    result = await schedule_user_deletion(uid, grace_period_days)

    assert result["grace_period_days"] == 7

    deletion_date = result["deletion_date"]
    expected_date = datetime.now(UTC) + timedelta(days=7)
    time_diff = abs((deletion_date - expected_date).total_seconds())
    assert time_diff < 60


async def test_schedule_user_deletion_firestore_error(mock_firestore_client: dict[str, Any]) -> None:
    """Test handling of Firestore errors during scheduling."""
    uid = "test-firebase-uid-error"

    mock_firestore_client["document"].set.side_effect = Exception("Firestore error")

    with pytest.raises(ExternalOperationError, match="Error scheduling user deletion"):
        await schedule_user_deletion(uid, 30)


async def test_schedule_user_deletion_zero_grace_period(mock_firestore_client: dict[str, Any]) -> None:
    """Test scheduling with zero grace period (immediate deletion)."""
    uid = "test-firebase-uid-immediate"
    grace_period_days = 0

    result = await schedule_user_deletion(uid, grace_period_days)

    assert result["grace_period_days"] == 0

    deletion_date = result["deletion_date"]
    now = datetime.now(UTC)
    time_diff = abs((deletion_date - now).total_seconds())
    assert time_diff < 60


async def test_get_user_deletion_status_found(mock_firestore_client: dict[str, Any]) -> None:
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


async def test_get_user_deletion_status_not_found(mock_firestore_client: dict[str, Any]) -> None:
    """Test retrieving non-existent deletion status."""
    uid = "test-firebase-uid-nonexistent"

    mock_doc_snapshot = MagicMock()
    mock_doc_snapshot.exists = False

    mock_firestore_client["document"].get.return_value = mock_doc_snapshot

    result = await get_user_deletion_status(uid)

    assert result is None


async def test_get_user_deletion_status_firestore_error(mock_firestore_client: dict[str, Any]) -> None:
    """Test handling of Firestore errors during status retrieval."""
    uid = "test-firebase-uid-error"

    mock_firestore_client["document"].get.side_effect = Exception("Firestore query error")

    with pytest.raises(ExternalOperationError, match="Error getting user deletion status"):
        await get_user_deletion_status(uid)


async def test_cancel_user_deletion_success(mock_firestore_client: dict[str, Any]) -> None:
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


async def test_cancel_user_deletion_not_found(mock_firestore_client: dict[str, Any]) -> None:
    """Test cancellation when no deletion request exists."""
    uid = "test-firebase-uid-no-deletion"

    mock_doc_snapshot = MagicMock()
    mock_doc_snapshot.exists = False

    mock_doc_ref = MagicMock()
    mock_doc_ref.get = AsyncMock(return_value=mock_doc_snapshot)

    mock_firestore_client["collection"].document.return_value = mock_doc_ref

    result = await cancel_user_deletion(uid)

    assert result is False


async def test_cancel_user_deletion_firestore_error(mock_firestore_client: dict[str, Any]) -> None:
    """Test handling of Firestore errors during cancellation."""
    uid = "test-firebase-uid-cancel-error"

    mock_doc_ref = MagicMock()
    mock_doc_ref.get = AsyncMock(side_effect=Exception("Firestore cancel error"))

    mock_firestore_client["collection"].document.return_value = mock_doc_ref

    with pytest.raises(ExternalOperationError, match="Error cancelling user deletion"):
        await cancel_user_deletion(uid)


async def test_cancel_user_deletion_update_error(mock_firestore_client: dict[str, Any]) -> None:
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


async def test_get_user_success(mocker: Any) -> None:
    """Test successful user retrieval."""

    mock_app = MagicMock()
    mocker.patch(
        "services.backend.src.utils.firebase.get_firebase_app",
        return_value=mock_app,
    )

    mock_user = MagicMock()
    mock_user.uid = "test-uid-123"
    mock_user.email = "test@example.com"
    mock_user.display_name = "Test User"
    mock_user.photo_url = "https://example.com/photo.jpg"
    mock_user.phone_number = "+1234567890"
    mock_user.email_verified = True
    mock_user.disabled = False
    mock_user.custom_claims = {"role": "user"}
    mock_user.provider_data = [
        MagicMock(
            provider_id="google.com",
            uid="google-uid-123",
            email="test@example.com",
            display_name="Test User",
            photo_url="https://example.com/photo.jpg",
            phone_number=None,
        )
    ]

    mock_firebase_get_user = AsyncMock(return_value=mock_user)
    mocker.patch(
        "services.backend.src.utils.firebase.as_async_callable",
        return_value=mock_firebase_get_user,
    )

    result = await get_user("test-uid-123")

    assert result is not None
    assert result["uid"] == "test-uid-123"
    assert result["email"] == "test@example.com"
    assert result["displayName"] == "Test User"
    assert result["photoURL"] == "https://example.com/photo.jpg"
    assert result["phoneNumber"] == "+1234567890"
    assert result["emailVerified"] is True
    assert result["disabled"] is False
    assert result["customClaims"] == {"role": "user"}
    assert len(result["providerData"]) == 1
    assert result["providerData"][0]["providerId"] == "google.com"


async def test_get_user_not_found(mocker: Any) -> None:
    """Test user not found scenario."""

    mock_app = MagicMock()
    mocker.patch(
        "services.backend.src.utils.firebase.get_firebase_app",
        return_value=mock_app,
    )

    from firebase_admin.exceptions import FirebaseError

    mock_firebase_get_user = AsyncMock(side_effect=FirebaseError("code", "USER_NOT_FOUND"))
    mocker.patch(
        "services.backend.src.utils.firebase.as_async_callable",
        return_value=mock_firebase_get_user,
    )

    result = await get_user("nonexistent-uid")

    assert result is None


async def test_get_user_firebase_error(mocker: Any) -> None:
    """Test Firebase error handling."""

    mock_app = MagicMock()
    mocker.patch(
        "services.backend.src.utils.firebase.get_firebase_app",
        return_value=mock_app,
    )

    from firebase_admin.exceptions import FirebaseError

    mock_firebase_get_user = AsyncMock(side_effect=FirebaseError("code", "Firebase error"))
    mocker.patch(
        "services.backend.src.utils.firebase.as_async_callable",
        return_value=mock_firebase_get_user,
    )

    with pytest.raises(ExternalOperationError, match="Error getting user by uid"):
        await get_user("error-uid")


async def test_get_users_success(mocker: Any) -> None:
    """Test successful batch user retrieval."""

    mock_app = MagicMock()
    mocker.patch(
        "services.backend.src.utils.firebase.get_firebase_app",
        return_value=mock_app,
    )

    mock_user1 = MagicMock()
    mock_user1.uid = "uid1"
    mock_user1.email = "user1@example.com"
    mock_user1.display_name = "User One"
    mock_user1.photo_url = None
    mock_user1.phone_number = None
    mock_user1.email_verified = True
    mock_user1.disabled = False
    mock_user1.custom_claims = None
    mock_user1.provider_data = []

    mock_user2 = MagicMock()
    mock_user2.uid = "uid2"
    mock_user2.email = "user2@example.com"
    mock_user2.display_name = "User Two"
    mock_user2.photo_url = "https://example.com/user2.jpg"
    mock_user2.phone_number = "+9876543210"
    mock_user2.email_verified = False
    mock_user2.disabled = True
    mock_user2.custom_claims = {"role": "admin"}
    mock_user2.provider_data = []

    mock_result = MagicMock()
    mock_result.users = [mock_user1, mock_user2]

    mock_firebase_get_users = AsyncMock(return_value=mock_result)
    mocker.patch(
        "services.backend.src.utils.firebase.as_async_callable",
        return_value=mock_firebase_get_users,
    )

    mock_uid_identifier = MagicMock()
    mocker.patch(
        "services.backend.src.utils.firebase.UidIdentifier",
        return_value=mock_uid_identifier,
    )

    result = await get_users(["uid1", "uid2"])

    assert len(result) == 2
    assert "uid1" in result
    assert "uid2" in result

    user1 = result["uid1"]
    assert user1["uid"] == "uid1"
    assert user1["email"] == "user1@example.com"
    assert user1["displayName"] == "User One"
    assert user1["photoURL"] is None
    assert user1["phoneNumber"] is None
    assert user1["emailVerified"] is True
    assert user1["disabled"] is False
    assert user1["customClaims"] is None

    user2 = result["uid2"]
    assert user2["uid"] == "uid2"
    assert user2["email"] == "user2@example.com"
    assert user2["displayName"] == "User Two"
    assert user2["photoURL"] == "https://example.com/user2.jpg"
    assert user2["phoneNumber"] == "+9876543210"
    assert user2["emailVerified"] is False
    assert user2["disabled"] is True
    assert user2["customClaims"] == {"role": "admin"}


async def test_get_users_empty_list(mocker: Any) -> None:
    """Test get_users with empty uid list."""
    result = await get_users([])
    assert result == {}
