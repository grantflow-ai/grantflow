from typing import NotRequired, TypedDict

from firebase_admin import initialize_app
from firebase_functions import https_fn, identity_fn

initialize_app()

logger = __import__("logging").getLogger(__name__)


class CustomClaims(TypedDict):
    domain: str
    access_level: str
    registration_time: NotRequired[int]


WHITELISTED_EMAILS = {
    "jacob.hanna@weizmann.ac.il",
    "koren_7@icloud.com",
    "masha.niv@mail.huji.ac.il",
    "mor.grinstein@gmail.com",
    "odedrechavi@gmail.com",
    "ronelasaf@gmail.com",
    "rotem1shalita@gmail.com",
    "rotblat@bgu.ac.il",
    "weilmiguel@gmail.com",
    "yaelcoh@tlvmc.gov.il",
}


def is_authorized_email(email: str) -> bool:
    email_lower = email.lower()
    return email_lower.endswith("@grantflow.ai") or email_lower in WHITELISTED_EMAILS


@identity_fn.before_user_created()  # type: ignore[misc]
def before_create(event: identity_fn.AuthBlockingEvent) -> identity_fn.BeforeCreateResponse | None:
    user = event.data
    email = user.email or ""

    logger.info("Registration attempt for email: %s", email)

    if not is_authorized_email(email):
        logger.warning("Blocking registration attempt for email: %s - not authorized", email)

        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Access restricted to authorized users only.",
        )

    custom_claims: CustomClaims = {
        "domain": "grantflow.ai",
        "access_level": "team_member",
        "registration_time": int(event.timestamp.timestamp() * 1000),
    }

    logger.info("Allowing registration for email: %s", email)

    return identity_fn.BeforeCreateResponse(
        custom_claims=dict(custom_claims),
    )


@identity_fn.before_user_signed_in()  # type: ignore[misc]
def before_sign_in(event: identity_fn.AuthBlockingEvent) -> identity_fn.BeforeSignInResponse | None:
    user = event.data
    email = user.email or ""

    logger.info("Sign-in attempt for email: %s", email)

    if not is_authorized_email(email):
        logger.warning("Blocking sign-in attempt for email: %s - not authorized", email)

        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Access restricted to authorized users only.",
        )

    logger.info("Allowing sign-in for email: %s", email)

    return identity_fn.BeforeSignInResponse()
