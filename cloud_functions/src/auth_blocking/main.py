from typing import NotRequired, TypedDict

from firebase_admin import initialize_app
from firebase_functions import https_fn, identity_fn

initialize_app()

logger = __import__("logging").getLogger(__name__)


class CustomClaims(TypedDict):
    """Custom claims added to user tokens."""

    domain: str
    access_level: str
    registration_time: NotRequired[int]


def is_grantflow_email(email: str) -> bool:
    """Check if email belongs to grantflow.ai domain."""
    return email.endswith("@grantflow.ai")


@identity_fn.before_user_created()
def before_create(event: identity_fn.AuthBlockingEvent) -> identity_fn.BeforeCreateResponse | None:
    """
    Firebase Auth blocking function for user registration.

    This function blocks registration attempts for users who don't have
    a @grantflow.ai email address.
    """

    user = event.data
    email = user.email or ""

    logger.info("Registration attempt for email: %s", email)

    if not is_grantflow_email(email):
        logger.warning("Blocking registration attempt for email: %s - not from grantflow.ai domain", email)

        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="Access restricted to grantflow.ai team members only.",
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


@identity_fn.before_user_signed_in()
def before_sign_in(event: identity_fn.AuthBlockingEvent) -> identity_fn.BeforeSignInResponse | None:
    """
    Firebase Auth blocking function for user sign-in.

    This function blocks sign-in attempts for users who don't have
    a @grantflow.ai email address.
    """

    user = event.data
    email = user.email or ""

    logger.info("Sign-in attempt for email: %s", email)

    if not is_grantflow_email(email):
        logger.warning("Blocking sign-in attempt for email: %s - not from grantflow.ai domain", email)

        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            message="Access restricted to grantflow.ai team members only.",
        )

    logger.info("Allowing sign-in for email: %s", email)

    return identity_fn.BeforeSignInResponse()
