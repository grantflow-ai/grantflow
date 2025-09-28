from datetime import UTC, datetime, timedelta
from secrets import token_hex
from typing import NamedTuple, cast
from uuid import UUID

from jwt import InvalidTokenError, decode, encode
from litestar.exceptions import NotAuthorizedException
from packages.db.src.enums import UserRoleEnum
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


class JWTClaims(NamedTuple):
    firebase_uid: str
    organization_id: UUID | None
    role: UserRoleEnum | None


def create_jwt(
    firebase_uid: str,
    organization_id: UUID | None = None,
    role: UserRoleEnum | None = None,
    ttl: timedelta | None = None,
) -> str:
    payload = {
        "sub": firebase_uid,
        "iat": int(datetime.now(UTC).timestamp()),
        "jti": token_hex(16),
    }

    if organization_id is not None:
        payload["organization_id"] = str(organization_id)

    if role is not None:
        payload["role"] = role.value

    if ttl is not None:
        payload["exp"] = int((datetime.now(tz=UTC) + ttl).timestamp())

    return encode(
        payload=payload,
        key=get_env("JWT_SECRET"),
        algorithm="HS256",
    )


def verify_jwt_token(token: str) -> str:
    try:
        decoded_token = decode(jwt=token, key=get_env("JWT_SECRET"), algorithms=["HS256"])
        return cast("str", decoded_token["sub"])
    except (
        ValueError,
        KeyError,
        InvalidTokenError,
    ) as e:
        logger.warning("Error verifying jwt.", exc_info=True)
        raise NotAuthorizedException("Invalid jwt") from e


def decode_jwt_claims(token: str) -> JWTClaims:
    try:
        decoded_token = decode(jwt=token, key=get_env("JWT_SECRET"), algorithms=["HS256"])

        firebase_uid = cast("str", decoded_token["sub"])

        organization_id = None
        if "organization_id" in decoded_token:
            organization_id = UUID(decoded_token["organization_id"])

        role = None
        if "role" in decoded_token:
            role = UserRoleEnum(decoded_token["role"])

        return JWTClaims(
            firebase_uid=firebase_uid,
            organization_id=organization_id,
            role=role,
        )
    except (
        ValueError,
        KeyError,
        InvalidTokenError,
    ) as e:
        logger.warning("Error decoding JWT claims", exc_info=True)
        raise NotAuthorizedException("Invalid jwt") from e
