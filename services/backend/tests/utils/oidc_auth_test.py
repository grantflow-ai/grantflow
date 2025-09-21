from unittest.mock import patch

from services.backend.src.utils.oidc_auth import verify_webhook_oidc_token


def test_verify_webhook_oidc_token_valid_token_success() -> None:
    mock_claims = {
        "email": "pubsub-invoker@grantflow.iam.gserviceaccount.com",
        "email_verified": True,
        "iss": "https://accounts.google.com",
        "aud": "https://backend.example.com/webhooks/pubsub/email-notifications",
    }

    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = mock_claims

        result = verify_webhook_oidc_token(
            token="valid.jwt.token",
            expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
        )

        assert result is True
        mock_verify.assert_called_once()


def test_verify_webhook_oidc_token_any_verified_email_succeeds() -> None:
    mock_claims = {
        "email": "any-service@grantflow.iam.gserviceaccount.com",
        "email_verified": True,
        "iss": "https://accounts.google.com",
        "aud": "https://backend.example.com/webhooks/pubsub/email-notifications",
    }

    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = mock_claims

        result = verify_webhook_oidc_token(
            token="valid.jwt.token",
            expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
        )

        assert result is True


def test_verify_webhook_oidc_token_email_not_verified_fails() -> None:
    mock_claims = {
        "email": "pubsub-invoker@grantflow.iam.gserviceaccount.com",
        "email_verified": False,
        "iss": "https://accounts.google.com",
        "aud": "https://backend.example.com/webhooks/pubsub/email-notifications",
    }

    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = mock_claims

        result = verify_webhook_oidc_token(
            token="valid.jwt.token",
            expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
        )

        assert result is False


def test_verify_webhook_oidc_token_invalid_issuer_fails() -> None:
    mock_claims = {
        "email": "pubsub-invoker@grantflow.iam.gserviceaccount.com",
        "email_verified": True,
        "iss": "https://malicious.example.com",
        "aud": "https://backend.example.com/webhooks/pubsub/email-notifications",
    }

    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = mock_claims

        result = verify_webhook_oidc_token(
            token="valid.jwt.token",
            expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
        )

        assert result is False


def test_verify_webhook_oidc_token_verification_exception_fails() -> None:
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.side_effect = ValueError("Invalid token")

        result = verify_webhook_oidc_token(
            token="invalid.jwt.token",
            expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
        )

        assert result is False


def test_verify_webhook_oidc_token_unexpected_exception_fails() -> None:
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.side_effect = Exception("Network error")

        result = verify_webhook_oidc_token(
            token="valid.jwt.token",
            expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
        )

        assert result is False


def test_verify_webhook_oidc_token_missing_claims_fail() -> None:
    test_cases = [
        {},
        {"email": "test@example.com"},
        {"email_verified": True},
        {"iss": "https://accounts.google.com"},
    ]

    for mock_claims in test_cases:
        with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = mock_claims

            result = verify_webhook_oidc_token(
                token="valid.jwt.token",
                expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
            )

            assert result is False, f"Should fail with claims: {mock_claims}"
