"""Tests for OIDC token verification utilities."""

from unittest.mock import patch

from services.backend.src.utils.oidc_auth import verify_pubsub_oidc_token


class TestVerifyPubSubOIDCToken:
    def test_valid_token_success(self) -> None:
        """Test successful token verification with valid claims."""
        mock_claims = {
            "email": "pubsub-invoker@grantflow.iam.gserviceaccount.com",
            "email_verified": True,
            "iss": "https://accounts.google.com",
            "aud": "https://backend.example.com/webhooks/pubsub/email-notifications",
        }

        with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = mock_claims

            result = verify_pubsub_oidc_token(
                token="valid.jwt.token",
                expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
                expected_email="pubsub-invoker@grantflow.iam.gserviceaccount.com",
            )

            assert result is True
            mock_verify.assert_called_once()

    def test_invalid_email_fails(self) -> None:
        """Test that token verification fails when email doesn't match."""
        mock_claims = {
            "email": "wrong-service@grantflow.iam.gserviceaccount.com",
            "email_verified": True,
            "iss": "https://accounts.google.com",
            "aud": "https://backend.example.com/webhooks/pubsub/email-notifications",
        }

        with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = mock_claims

            result = verify_pubsub_oidc_token(
                token="valid.jwt.token",
                expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
                expected_email="pubsub-invoker@grantflow.iam.gserviceaccount.com",
            )

            assert result is False

    def test_email_not_verified_fails(self) -> None:
        """Test that token verification fails when email is not verified."""
        mock_claims = {
            "email": "pubsub-invoker@grantflow.iam.gserviceaccount.com",
            "email_verified": False,
            "iss": "https://accounts.google.com",
            "aud": "https://backend.example.com/webhooks/pubsub/email-notifications",
        }

        with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = mock_claims

            result = verify_pubsub_oidc_token(
                token="valid.jwt.token",
                expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
                expected_email="pubsub-invoker@grantflow.iam.gserviceaccount.com",
            )

            assert result is False

    def test_invalid_issuer_fails(self) -> None:
        """Test that token verification fails when issuer is invalid."""
        mock_claims = {
            "email": "pubsub-invoker@grantflow.iam.gserviceaccount.com",
            "email_verified": True,
            "iss": "https://malicious.example.com",
            "aud": "https://backend.example.com/webhooks/pubsub/email-notifications",
        }

        with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.return_value = mock_claims

            result = verify_pubsub_oidc_token(
                token="valid.jwt.token",
                expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
                expected_email="pubsub-invoker@grantflow.iam.gserviceaccount.com",
            )

            assert result is False

    def test_token_verification_exception_fails(self) -> None:
        """Test that ValueError from google auth library is handled gracefully."""
        with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.side_effect = ValueError("Invalid token")

            result = verify_pubsub_oidc_token(
                token="invalid.jwt.token",
                expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
                expected_email="pubsub-invoker@grantflow.iam.gserviceaccount.com",
            )

            assert result is False

    def test_unexpected_exception_fails(self) -> None:
        """Test that unexpected exceptions are handled gracefully."""
        with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
            mock_verify.side_effect = Exception("Network error")

            result = verify_pubsub_oidc_token(
                token="valid.jwt.token",
                expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
                expected_email="pubsub-invoker@grantflow.iam.gserviceaccount.com",
            )

            assert result is False

    def test_missing_claims_fail(self) -> None:
        """Test that missing required claims cause verification to fail."""
        test_cases = [
            {},  # Empty claims
            {"email": "test@example.com"},  # Missing email_verified and iss
            {"email_verified": True},  # Missing email and iss
            {"iss": "https://accounts.google.com"},  # Missing email and email_verified
        ]

        for mock_claims in test_cases:
            with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
                mock_verify.return_value = mock_claims

                result = verify_pubsub_oidc_token(
                    token="valid.jwt.token",
                    expected_audience="https://backend.example.com/webhooks/pubsub/email-notifications",
                    expected_email="pubsub-invoker@grantflow.iam.gserviceaccount.com",
                )

                assert result is False, f"Should fail with claims: {mock_claims}"
