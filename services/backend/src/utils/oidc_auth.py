import google.auth.transport.requests
import google.oauth2.id_token
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


def verify_webhook_oidc_token(token: str, expected_audience: str) -> bool:
    """
    Verify a Google Cloud OIDC token for webhook authentication.

    Args:
        token: The JWT token from the Authorization header
        expected_audience: The expected audience URL (webhook endpoint)

    Returns:
        True if token is valid and from a Google service account, False otherwise
    """
    try:
        request = google.auth.transport.requests.Request()  # type: ignore[no-untyped-call]

        claims = google.oauth2.id_token.verify_oauth2_token(  # type: ignore[no-untyped-call]
            token, request, audience=expected_audience
        )

        if not claims.get("email_verified", False):
            logger.warning("Token email not verified", email=claims.get("email"))
            return False

        expected_issuer = "https://accounts.google.com"
        if claims.get("iss") != expected_issuer:
            logger.warning("Token issuer mismatch", expected=expected_issuer, actual=claims.get("iss"))
            return False

        logger.debug(
            "Successfully verified OIDC token",
            email=claims.get("email"),
            audience=claims.get("aud"),
            issuer=claims.get("iss"),
        )

        return True

    except ValueError as e:
        logger.warning("Failed to verify OIDC token", error=str(e))
        return False
    except Exception as e:
        logger.error("Unexpected error verifying OIDC token", error=str(e))
        return False
