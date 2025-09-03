from datetime import UTC, datetime, timedelta
from typing import Any, NotRequired, Required, TypedDict, cast

from firebase_admin import App, initialize_app
from firebase_admin.auth import UidIdentifier
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
firestore_client_ref = Ref[Any]()


class UserMetadata(TypedDict):
    created_at: NotRequired[int | None]
    last_login_at: NotRequired[int | None]
    last_refresh_at_millis: NotRequired[int | None]


class ProviderUserInfo(TypedDict):
    uid: str
    display_name: NotRequired[str | None]
    email: NotRequired[str | None]
    phone_number: NotRequired[str | None]
    photo_url: NotRequired[str | None]
    provider_id: str


class FirebaseUser(TypedDict):
    local_id: Required[str]
    display_name: NotRequired[str | None]
    email: NotRequired[str | None]
    phone_number: NotRequired[str | None]
    photo_url: NotRequired[str | None]
    email_verified: NotRequired[bool]
    disabled: NotRequired[bool]
    valid_since: NotRequired[str | None]
    created_at: NotRequired[str | None]
    last_login_at: NotRequired[str | None]
    last_refresh_at: NotRequired[str | None]
    provider_user_info: NotRequired[list[ProviderUserInfo]]
    custom_attributes: NotRequired[str | None]
    tenant_id: NotRequired[str | None]


def get_firebase_app() -> App:
    if firebase_app_ref.value is None:
        logger.debug("Initializing Firebase app")
        service_account_dict = deserialize(get_env("FIREBASE_SERVICE_ACCOUNT_CREDENTIALS"), dict[str, Any])

        credentials = Credentials.from_service_account_info(  # type: ignore[no-untyped-call]
            service_account_dict,
            scopes=[
                "https://www.googleapis.com/auth/cloud-platform",
                "https://www.googleapis.com/auth/firebase",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/identitytoolkit",
            ],
        )

        firebase_app_ref.value = initialize_app(credential=credentials)
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


async def get_user_by_email(email: str) -> FirebaseUser | None:
    handler = as_async_callable(firebase_get_user_by_email)
    try:
        user = await handler(email, app=get_firebase_app())
        return FirebaseUser(
            local_id=user.uid,
            email=user.email,
            display_name=user.display_name,
            photo_url=user.photo_url,
            phone_number=user.phone_number,
            email_verified=user.email_verified,
            disabled=user.disabled,
            custom_attributes=str(user.custom_claims) if user.custom_claims else None,
            tenant_id=user.tenant_id,
            provider_user_info=[
                ProviderUserInfo(
                    uid=provider.uid,
                    provider_id=provider.provider_id,
                    email=provider.email,
                    display_name=provider.display_name,
                    photo_url=provider.photo_url,
                    phone_number=provider.phone_number,
                )
                for provider in user.provider_data
            ] if user.provider_data else None,
            valid_since=str(user.tokens_valid_after_timestamp) if hasattr(user, 'tokens_valid_after_timestamp') and user.tokens_valid_after_timestamp else None,
            created_at=str(user.user_metadata.creation_timestamp) if user.user_metadata and user.user_metadata.creation_timestamp else None,
            last_login_at=str(user.user_metadata.last_sign_in_timestamp) if user.user_metadata and user.user_metadata.last_sign_in_timestamp else None,
            last_refresh_at=str(user.user_metadata.last_refresh_timestamp) if user.user_metadata and hasattr(user.user_metadata, 'last_refresh_timestamp') and user.user_metadata.last_refresh_timestamp else None,
        )
    except FirebaseError as e:
        if "USER_NOT_FOUND" in str(e):
            return None
        logger.warning("Error getting user by email.", exc_info=e)
        raise ExternalOperationError("Error getting user by email.") from e


async def get_user(uid: str) -> FirebaseUser | None:
    handler = as_async_callable(firebase_get_user)
    try:
        user = await handler(uid, app=get_firebase_app())
        return FirebaseUser(
            local_id=user.uid,
            email=user.email,
            display_name=user.display_name,
            photo_url=user.photo_url,
            phone_number=user.phone_number,
            email_verified=user.email_verified,
            disabled=user.disabled,
            custom_attributes=str(user.custom_claims) if user.custom_claims else None,
            tenant_id=user.tenant_id,
            provider_user_info=[
                ProviderUserInfo(
                    uid=provider.uid,
                    provider_id=provider.provider_id,
                    email=provider.email,
                    display_name=provider.display_name,
                    photo_url=provider.photo_url,
                    phone_number=provider.phone_number,
                )
                for provider in user.provider_data
            ] if user.provider_data else None,
            valid_since=str(user.tokens_valid_after_timestamp) if hasattr(user, 'tokens_valid_after_timestamp') and user.tokens_valid_after_timestamp else None,
            created_at=str(user.user_metadata.creation_timestamp) if user.user_metadata and user.user_metadata.creation_timestamp else None,
            last_login_at=str(user.user_metadata.last_sign_in_timestamp) if user.user_metadata and user.user_metadata.last_sign_in_timestamp else None,
            last_refresh_at=str(user.user_metadata.last_refresh_timestamp) if user.user_metadata and hasattr(user.user_metadata, 'last_refresh_timestamp') and user.user_metadata.last_refresh_timestamp else None,
        )
    except FirebaseError as e:
        if "USER_NOT_FOUND" in str(e):
            return None
        logger.warning("Error getting user by uid.", uid=uid, exc_info=e)
        raise ExternalOperationError("Error getting user by uid.") from e


async def get_users(uids: list[str]) -> dict[str, FirebaseUser]:
    if not uids:
        return {}

    handler = as_async_callable(firebase_get_users)
    try:
        identifiers = [UidIdentifier(uid) for uid in uids]
        result = await handler(identifiers, app=get_firebase_app())

        users_dict = {}
        for user in result.users:
            users_dict[user.uid] = FirebaseUser(
                local_id=user.uid,
                email=user.email,
                display_name=user.display_name,
                photo_url=user.photo_url,
                phone_number=user.phone_number,
                email_verified=user.email_verified,
                disabled=user.disabled,
                custom_attributes=str(user.custom_claims) if user.custom_claims else None,
                tenant_id=user.tenant_id,
                provider_user_info=[
                    ProviderUserInfo(
                        uid=provider.uid,
                        provider_id=provider.provider_id,
                        email=provider.email,
                        display_name=provider.display_name,
                        photo_url=provider.photo_url,
                        phone_number=provider.phone_number,
                    )
                    for provider in user.provider_data
                ] if user.provider_data else None,
                valid_since=str(user.tokens_valid_after_timestamp) if hasattr(user, 'tokens_valid_after_timestamp') and user.tokens_valid_after_timestamp else None,
                created_at=str(user.user_metadata.creation_timestamp) if user.user_metadata and user.user_metadata.creation_timestamp else None,
                last_login_at=str(user.user_metadata.last_sign_in_timestamp) if user.user_metadata and user.user_metadata.last_sign_in_timestamp else None,
                last_refresh_at=str(user.user_metadata.last_refresh_timestamp) if user.user_metadata and hasattr(user.user_metadata, 'last_refresh_timestamp') and user.user_metadata.last_refresh_timestamp else None,
            )
        return users_dict
    except FirebaseError as e:
        logger.warning("Error getting users by uids.", exc_info=e)
        raise ExternalOperationError("Error getting users by uids.") from e


async def delete_user(uid: str) -> None:
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


def get_firestore_client() -> Any:
    if firestore_client_ref.value is None:
        logger.debug("Initializing Firestore client")
        firestore_client_ref.value = AsyncClient()
    return firestore_client_ref.value


async def schedule_user_deletion(uid: str, grace_period_days: int = 30) -> dict[str, Any]:
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


async def schedule_organization_deletion(organization_id: str, grace_period_days: int = 30) -> dict[str, Any]:
    db = get_firestore_client()
    scheduled_hard_delete_at = datetime.now(UTC) + timedelta(days=grace_period_days)

    doc_data = {
        "organization_id": organization_id,
        "status": "scheduled",
        "scheduled_at": SERVER_TIMESTAMP,
        "scheduled_hard_delete_at": scheduled_hard_delete_at,
        "grace_period_days": grace_period_days,
        "created_at": SERVER_TIMESTAMP,
        "updated_at": SERVER_TIMESTAMP,
    }

    try:
        await db.collection("organization-deletion-requests").document(organization_id).set(doc_data)
        logger.info(
            "Scheduled organization for deletion",
            organization_id=organization_id,
            scheduled_hard_delete_at=scheduled_hard_delete_at.isoformat(),
        )
        return doc_data
    except Exception as e:
        logger.warning("Error scheduling organization deletion", organization_id=organization_id, exc_info=e)
        raise ExternalOperationError("Error scheduling organization deletion") from e


async def get_organization_deletion_status(organization_id: str) -> dict[str, Any] | None:
    db = get_firestore_client()

    try:
        doc = await db.collection("organization-deletion-requests").document(organization_id).get()
        if doc.exists:
            data = doc.to_dict()
            logger.debug(
                "Retrieved organization deletion status",
                organization_id=organization_id,
                status=data.get("status") if data else None,
            )
            return cast("dict[str, Any]", data)
        return None
    except Exception as e:
        logger.warning("Error getting organization deletion status", organization_id=organization_id, exc_info=e)
        raise ExternalOperationError("Error getting organization deletion status") from e


async def cancel_organization_deletion(organization_id: str) -> bool:
    db = get_firestore_client()

    try:
        doc_ref = db.collection("organization-deletion-requests").document(organization_id)
        doc = await doc_ref.get()

        if not doc.exists:
            logger.warning("No deletion request found to cancel", organization_id=organization_id)
            return False

        await doc_ref.update(
            {
                "status": "cancelled",
                "cancelled_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP,
            }
        )

        logger.info("Cancelled organization deletion", organization_id=organization_id)
        return True
    except Exception as e:
        logger.warning("Error cancelling organization deletion", organization_id=organization_id, exc_info=e)
        raise ExternalOperationError("Error cancelling organization deletion") from e
