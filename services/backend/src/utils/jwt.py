from datetime import UTC, datetime, timedelta
from secrets import token_hex
from typing import cast

from jwt import InvalidTokenError
from litestar.exceptions import NotAuthorizedException
from packages.shared_utils.env import get_env
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


def create_jwt(firebase_uid: str, ttl: timedelta | None = None) -> str:
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
    from jwt import decode

    try:
        decoded_token = decode(jwt=token, key=get_env("JWT_SECRET"), algorithms=["HS256"])
        return cast("str", decoded_token["sub"])
    except (
        ValueError,
        KeyError,
        InvalidTokenError,
    ) as e:
        logger.warning("Error verifying jwt.", exec_info=e)
        raise NotAuthorizedException("Invalid jwt") from e
