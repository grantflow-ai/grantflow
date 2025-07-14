from datetime import UTC, datetime, timedelta
from typing import Any, cast

from firebase_admin import App, initialize_app
from firebase_admin.auth import (
    delete_user as firebase_delete_user,
)
from firebase_admin.auth import (
    get_user as firebase_get_user,
)
from firebase_admin.auth import (
    get_user_by_email as firebase_get_user_by_email,
)
from firebase_admin.auth import (
    get_users as firebase_get_users,
)
from firebase_admin.auth import (
    verify_id_token as firebase_verify_id_token,
)
from firebase_admin.exceptions import FirebaseError
from google.cloud.firestore import SERVER_TIMESTAMP, AsyncClient
from google.oauth2.service_account import Credentials
from litestar.exceptions import NotAuthorizedException
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import ExternalOperationError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.serialization import deserialize
from packages.shared_utils.src.sync import as_async_callable

logger = get_logger(__name__)

firebase_app_ref = Ref[App]()


def get_firebase_app() -> App:
    if firebase_app_ref.value is None:
        logger.debug("Initializing Firebase app")
        service_account_dict = deserialize(get_env("FIREBASE_SERVICE_ACCOUNT_CREDENTIALS"), dict[str, Any])
        firebase_app_ref.value = initialize_app(
            credential=Credentials.from_service_account_info(service_account_dict),  # type: ignore[no-untyped-call]
        )
    return firebase_app_ref.value


async def verify_id_token(id_token: str) -> dict[str, Any]:
    handler = as_async_callable(firebase_verify_id_token)
    try:
        decoded_token = await handler(id_token, app=get_firebase_app())
        return cast("dict[str, Any]", decoded_token)
    except (
        ValueError,
        FirebaseError,
    ) as e:
        logger.warning("Error verifying token.", exc_info=e)
        raise NotAuthorizedException("Invalid ID token") from e


async def get_user_by_email(email: str) -> dict[str, Any] | None:
    handler = as_async_callable(firebase_get_user_by_email)
    try:
        user = await handler(email, app=get_firebase_app())
        return cast("dict[str, Any]", user)
    except FirebaseError as e:
        if "USER_NOT_FOUND" in str(e):
            return None
        logger.warning("Error getting user by email.", exc_info=e)
        raise ExternalOperationError("Error getting user by email.") from e


async def get_user(uid: str) -> dict[str, Any] | None:
    handler = as_async_callable(firebase_get_user)
    try:
        user = await handler(uid, app=get_firebase_app())
        return cast("dict[str, Any]", user)
    except FirebaseError as e:
        if "USER_NOT_FOUND" in str(e):
            return None
        logger.warning("Error getting user by uid.", uid=uid, exc_info=e)
        raise ExternalOperationError("Error getting user by uid.") from e


async def get_users(uids: list[str]) -> dict[str, dict[str, Any]]:
    if not uids:
        return {}

    handler = as_async_callable(firebase_get_users)
    try:
        identifiers = [{"uid": uid} for uid in uids]
        result = await handler(identifiers, app=get_firebase_app())
        users = cast("list[dict[str, Any]]", result.users)
        return {user["uid"]: user for user in users}
    except FirebaseError as e:
        logger.warning("Error getting users by uids.", exc_info=e)
        raise ExternalOperationError("Error getting users by uids.") from e


async def delete_user(uid: str) -> None:
    """Delete a user from Firebase Auth"""
    handler = as_async_callable(firebase_delete_user)
    try:
        await handler(uid, app=get_firebase_app())
        logger.info("Deleted Firebase user", firebase_uid=uid)
    except FirebaseError as e:
        if "USER_NOT_FOUND" in str(e):
            logger.warning("User not found for deletion", firebase_uid=uid)
            return
        logger.warning("Error deleting user", firebase_uid=uid, exc_info=e)
        raise ExternalOperationError("Error deleting user from Firebase") from e


_firestore_client_ref = Ref[Any]()


def get_firestore_client() -> Any:
    """Get Firestore client instance"""
    if _firestore_client_ref.value is None:
        logger.debug("Initializing Firestore client")
        _firestore_client_ref.value = AsyncClient()
    return _firestore_client_ref.value


async def schedule_user_deletion(uid: str, grace_period_days: int = 30) -> dict[str, Any]:
    """Schedule a user for deletion in Firestore"""
    db = get_firestore_client()
    deletion_date = datetime.now(UTC) + timedelta(days=grace_period_days)

    doc_data = {
        "firebase_uid": uid,
        "status": "scheduled",
        "scheduled_at": SERVER_TIMESTAMP,
        "deletion_date": deletion_date,
        "grace_period_days": grace_period_days,
        "created_at": SERVER_TIMESTAMP,
        "updated_at": SERVER_TIMESTAMP,
    }

    try:
        await db.collection("user-deletion-requests").document(uid).set(doc_data)
        logger.info(
            "Scheduled user for deletion",
            firebase_uid=uid,
            deletion_date=deletion_date.isoformat(),
        )
        return doc_data
    except Exception as e:
        logger.warning("Error scheduling user deletion", firebase_uid=uid, exc_info=e)
        raise ExternalOperationError("Error scheduling user deletion") from e


async def get_user_deletion_status(uid: str) -> dict[str, Any] | None:
    """Get user deletion status from Firestore"""
    db = get_firestore_client()

    try:
        doc = await db.collection("user-deletion-requests").document(uid).get()
        if doc.exists:
            data = doc.to_dict()
            logger.debug(
                "Retrieved user deletion status",
                firebase_uid=uid,
                status=data.get("status") if data else None,
            )
            return cast("dict[str, Any]", data)
        return None
    except Exception as e:
        logger.warning("Error getting user deletion status", firebase_uid=uid, exc_info=e)
        raise ExternalOperationError("Error getting user deletion status") from e


async def cancel_user_deletion(uid: str) -> bool:
    """Cancel scheduled user deletion"""
    db = get_firestore_client()

    try:
        doc_ref = db.collection("user-deletion-requests").document(uid)
        doc = await doc_ref.get()

        if not doc.exists:
            logger.warning("No deletion request found to cancel", firebase_uid=uid)
            return False

        await doc_ref.update(
            {
                "status": "cancelled",
                "cancelled_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP,
            }
        )

        logger.info("Cancelled user deletion", firebase_uid=uid)
        return True
    except Exception as e:
        logger.warning("Error cancelling user deletion", firebase_uid=uid, exc_info=e)
        raise ExternalOperationError("Error cancelling user deletion") from e
