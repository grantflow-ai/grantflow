from typing import Any, cast

from firebase_admin import App
from firebase_admin.auth import get_user_by_email as firebase_get_user_by_email
from firebase_admin.exceptions import FirebaseError
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
        from firebase_admin import initialize_app

        logger.debug("Initializing Firebase app")
        service_account_dict = deserialize(get_env("FIREBASE_SERVICE_ACCOUNT_CREDENTIALS"), dict[str, Any])
        firebase_app_ref.value = initialize_app(
            credential=Credentials.from_service_account_info(service_account_dict),  # type: ignore[no-untyped-call]
        )
    return firebase_app_ref.value


async def verify_id_token(id_token: str) -> dict[str, Any]:
    from firebase_admin.auth import verify_id_token as firebase_verify_id_token

    handler = as_async_callable(firebase_verify_id_token)
    try:
        decoded_token = await handler(id_token, app=get_firebase_app())
        return cast("dict[str, Any]", decoded_token)
    except (
        ValueError,
        FirebaseError,
    ) as e:
        logger.warning("Error verifying token.", exec_info=e)
        raise NotAuthorizedException("Invalid ID token") from e


async def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Get a Firebase user by email address.

    Args:
        email: The email address to look up.

    Returns:
        The user data if found, None otherwise.
    """
    handler = as_async_callable(firebase_get_user_by_email)
    try:
        user = await handler(email, app=get_firebase_app())
        return cast("dict[str, Any]", user)
    except FirebaseError as e:
        if "USER_NOT_FOUND" in str(e):
            return None
        logger.warning("Error getting user by email.", exec_info=e)
        raise ExternalOperationError("Error getting user by email.") from e
