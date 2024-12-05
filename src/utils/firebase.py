import logging
from collections.abc import Callable, Coroutine
from functools import partial
from typing import Any, cast

from firebase_admin import App
from firebase_admin.auth import ExpiredIdTokenError, InvalidIdTokenError, RevokedIdTokenError, UserDisabledError

from src.utils.ref import Ref
from src.utils.sync import as_async_callable

logger = logging.getLogger(__name__)

firebase_app_ref = Ref[App]()
auth_handler_ref = Ref[Callable[[str], Coroutine[dict[str, str], Any, Any]]]()


def get_firebase_app() -> App:
    """Get the Firebase app.

    Returns:
        The Firebase app.
    """
    if firebase_app_ref.value is None:
        from firebase_admin import initialize_app

        firebase_app_ref.value = initialize_app()
    return firebase_app_ref.value


def get_auth_handler() -> Callable[[str], Coroutine[dict[str, str], Any, Any]]:
    """Get the auth handler.

    Returns:
        The auth handler.
    """
    if auth_handler_ref.value is None:
        from firebase_admin.auth import verify_id_token

        app = get_firebase_app()
        auth_handler_ref.value = as_async_callable(partial(verify_id_token, app=app, check_revoked=True))
    return auth_handler_ref.value


async def verify_id_token(id_token: str) -> str | None:
    """Verify a firebase ID token.

    Args:
        id_token: The ID token to verify.

    Returns:
        The firebase user ID if the token is valid, otherwise None.
    """
    handler = get_auth_handler()
    try:
        decoded_token = await handler(id_token)
        return cast(str, decoded_token["uid"])
    except (ValueError, InvalidIdTokenError, ExpiredIdTokenError, RevokedIdTokenError, UserDisabledError) as e:
        logger.warning("Error verifying token: %s", e)
        return None
