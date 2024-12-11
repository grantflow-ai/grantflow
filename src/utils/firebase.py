import logging
from datetime import UTC, datetime, timedelta
from secrets import token_hex
from typing import Any, cast

from firebase_admin import App
from firebase_admin.auth import (
    ExpiredIdTokenError,
    InvalidIdTokenError,
    RevokedIdTokenError,
    UserDisabledError,
)
from google.auth.exceptions import RefreshError
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
        InvalidIdTokenError,
        ExpiredIdTokenError,
        RevokedIdTokenError,
        UserDisabledError,
        RefreshError,
    ) as e:
        logger.warning("Error verifying token: %s", e)
        raise Unauthorized("Invalid ID token") from e


async def create_jwt_for_id_token(id_token: str) -> str:
    """Create a session cookie from an ID token.

    Args:
        id_token: The ID token.

    Returns:
        The session cookie.
    """
    decoded_token = await verify_id_token(id_token)
    return create_jwt(decoded_token["uid"])


def create_jwt(firebase_uid: str, ttl: timedelta | None = None) -> str:
    """Create a session cookie from an ID token.

    Args:
        firebase_uid: The firebase user ID.
        ttl: The time to live for the token.

    Returns:
        The session cookie.
    """
    from jwt import encode

    payload = {
        "sub": firebase_uid,
        "iat": int(datetime.now(UTC).timestamp()),
        "jti": token_hex(16),
    }
    if ttl is not None:
        payload["exp"] = int((datetime.now(tz=UTC) + ttl).timestamp())

    return encode(
        payload=payload,
        key=get_env("JWT_SECRET"),
        algorithm="HS256",
    )


def verify_jwt_token(token: str) -> str:
    """Verify a session cookie.

    Args:
        token: The token to verify.

    Raises:
        Unauthorized: If the cookie is invalid

    Returns:
        The user ID.
    """
    from jwt import decode

    try:
        decoded_token = decode(jwt=token, key=get_env("JWT_SECRET"), algorithms=["HS256"])
        return cast(str, decoded_token["sub"])
    except (
        ValueError,
        KeyError,
    ) as e:
        logger.warning("Error verifying session cookie: %s", e)
        raise Unauthorized("Invalid session cookie") from e
