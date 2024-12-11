import logging
from typing import Any, cast

from firebase_admin import App
from firebase_admin.exceptions import FirebaseError
from google.oauth2.service_account import Credentials
from sanic import Unauthorized

from src.utils.env import get_env
from src.utils.ref import Ref
from src.utils.serialization import deserialize
from src.utils.sync import as_async_callable

logger = logging.getLogger(__name__)

firebase_app_ref = Ref[App]()


def get_firebase_app() -> App:
    """Get the Firebase app.

    Returns:
        The Firebase app.
    """
    if firebase_app_ref.value is None:
        from firebase_admin import initialize_app

        service_account_dict = deserialize(get_env("FIREBASE_SERVICE_ACCOUNT"), dict[str, Any])
        firebase_app_ref.value = initialize_app(
            credential=Credentials.from_service_account_info(service_account_dict),  # type: ignore[no-untyped-call]
            options={
                "authDomain": "grantflow-9e8f3.firebaseapp.com",
                "projectId": "grantflow-9e8f3",
            },
        )
    return firebase_app_ref.value


async def verify_id_token(id_token: str) -> dict[str, Any]:
    """Verify a firebase ID token.

    Args:
        id_token: The ID token to verify.

    Raises:
        Unauthorized: If the token is invalid

    Returns:
        The firebase user ID if the token is valid, otherwise None.
    """
    from firebase_admin.auth import verify_id_token as firebase_verify_id_token

    handler = as_async_callable(firebase_verify_id_token)
    try:
        decoded_token = await handler(id_token, app=get_firebase_app())
        return cast(dict[str, Any], decoded_token)
    except (
        ValueError,
        FirebaseError,
    ) as e:
        logger.warning("Error verifying token: %s", e)
        raise Unauthorized("Invalid ID token") from e
