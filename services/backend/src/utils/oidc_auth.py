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
    logger.debug(
        "Starting OIDC token verification",
        expected_audience=expected_audience,
        token_length=len(token) if token else 0,
    )

    try:
        request = google.auth.transport.requests.Request()  # type: ignore[no-untyped-call]

        claims = google.oauth2.id_token.verify_oauth2_token(  # type: ignore[no-untyped-call]
            token, request, audience=expected_audience
        )

        logger.debug(
            "Token claims extracted",
            email=claims.get("email"),
            email_verified=claims.get("email_verified"),
            audience=claims.get("aud"),
            issuer=claims.get("iss"),
            subject=claims.get("sub"),
            azp=claims.get("azp"),
        )

        if not claims.get("email_verified", False):
            logger.warning(
                "Token email not verified",
                email=claims.get("email"),
                email_verified=claims.get("email_verified"),
                all_claims=list(claims.keys()),
            )
            return False

        expected_issuer = "https://accounts.google.com"
        if claims.get("iss") != expected_issuer:
            logger.warning(
                "Token issuer mismatch",
                expected_issuer=expected_issuer,
                actual_issuer=claims.get("iss"),
                all_claims=list(claims.keys()),
            )
            return False

        logger.debug(
            "Successfully verified OIDC token",
            email=claims.get("email"),
            audience=claims.get("aud"),
            issuer=claims.get("iss"),
            subject=claims.get("sub"),
        )

        return True

    except ValueError as e:
        # Common ValueError reasons:
        # - Token expired
        # - Audience mismatch
        # - Invalid token signature
        # - Token not yet valid (nbf claim)
        error_msg = str(e).lower()
        if "expired" in error_msg:
            logger.error(
                "OIDC token expired",
                error=str(e),
                expected_audience=expected_audience,
            )
        elif "audience" in error_msg:
            logger.error(
                "OIDC token audience mismatch",
                error=str(e),
                expected_audience=expected_audience,
            )
        elif "signature" in error_msg:
            logger.error(
                "OIDC token signature invalid",
                error=str(e),
                expected_audience=expected_audience,
            )
        else:
            logger.error(
                "Failed to verify OIDC token - ValueError",
                error=str(e),
                expected_audience=expected_audience,
                error_type=type(e).__name__,
            )
        return False
    except Exception as e:
        logger.error(
            "Unexpected error verifying OIDC token",
            error=str(e),
            error_type=type(e).__name__,
            expected_audience=expected_audience,
        )
        return False
