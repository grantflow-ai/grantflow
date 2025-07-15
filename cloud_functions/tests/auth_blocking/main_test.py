from datetime import UTC, datetime
from typing import Any
from unittest.mock import Mock, patch

import pytest
from firebase_functions import https_fn, identity_fn

from cloud_functions.src.auth_blocking.main import (
    before_create,
    before_sign_in,
    is_grantflow_email,
)


class TestEmailValidation:
    """Test email domain validation."""

    def test_is_grantflow_email_valid(self) -> None:
        """Test valid grantflow.ai emails."""
        assert is_grantflow_email("user@grantflow.ai") is True
        assert is_grantflow_email("team.member@grantflow.ai") is True
        assert is_grantflow_email("test+tag@grantflow.ai") is True

    def test_is_grantflow_email_invalid(self) -> None:
        """Test invalid emails."""
        assert is_grantflow_email("user@gmail.com") is False
        assert is_grantflow_email("user@company.com") is False
        assert is_grantflow_email("user@grantflow.com") is False
        assert is_grantflow_email("user@subdomain.grantflow.ai") is False
        assert is_grantflow_email("") is False
        assert is_grantflow_email("invalid-email") is False


class TestBeforeCreateFunction:
    """Test the beforeCreate auth blocking function."""

    @patch("cloud_functions.src.auth_blocking.main.logger")
    def test_allows_grantflow_email(self, mock_logger: Any) -> None:
        """Test that grantflow.ai emails are allowed."""

        user_record = Mock(spec=identity_fn.AuthUserRecord)
        user_record.email = "user@grantflow.ai"
        user_record.uid = "test-uid-123"

        event = Mock(spec=identity_fn.AuthBlockingEvent)
        event.data = user_record
        event.timestamp = datetime.now(UTC)

        response = before_create(event)

        assert response is not None
        assert response.custom_claims is not None
        assert response.custom_claims["domain"] == "grantflow.ai"
        assert response.custom_claims["access_level"] == "team_member"
        assert "registration_time" in response.custom_claims

        mock_logger.info.assert_called()
        mock_logger.warning.assert_not_called()

    @patch("cloud_functions.src.auth_blocking.main.logger")
    def test_blocks_non_grantflow_email(self, mock_logger: Any) -> None:
        """Test that non-grantflow.ai emails are blocked."""

        user_record = Mock(spec=identity_fn.AuthUserRecord)
        user_record.email = "user@gmail.com"
        user_record.uid = "test-uid-123"

        event = Mock(spec=identity_fn.AuthBlockingEvent)
        event.data = user_record
        event.timestamp = datetime.now(UTC)

        with pytest.raises(https_fn.HttpsError) as exc_info:
            before_create(event)

        assert exc_info.value.code == https_fn.FunctionsErrorCode.INVALID_ARGUMENT
        assert "Access restricted to grantflow.ai team members only" in str(exc_info.value.message)

        mock_logger.warning.assert_called()

    @patch("cloud_functions.src.auth_blocking.main.logger")
    def test_handles_missing_email(self, mock_logger: Any) -> None:
        """Test handling of missing email in event data."""

        user_record = Mock(spec=identity_fn.AuthUserRecord)
        user_record.email = None
        user_record.uid = "test-uid-123"

        event = Mock(spec=identity_fn.AuthBlockingEvent)
        event.data = user_record
        event.timestamp = datetime.now(UTC)

        with pytest.raises(https_fn.HttpsError) as exc_info:
            before_create(event)

        assert exc_info.value.code == https_fn.FunctionsErrorCode.INVALID_ARGUMENT


class TestBeforeSignInFunction:
    """Test the beforeSignIn auth blocking function."""

    @patch("cloud_functions.src.auth_blocking.main.logger")
    def test_allows_grantflow_email(self, mock_logger: Any) -> None:
        """Test that grantflow.ai emails are allowed."""

        user_record = Mock(spec=identity_fn.AuthUserRecord)
        user_record.email = "user@grantflow.ai"
        user_record.uid = "test-uid-123"

        event = Mock(spec=identity_fn.AuthBlockingEvent)
        event.data = user_record
        event.timestamp = datetime.now(UTC)

        response = before_sign_in(event)

        assert response is not None

        mock_logger.info.assert_called()
        mock_logger.warning.assert_not_called()

    @patch("cloud_functions.src.auth_blocking.main.logger")
    def test_blocks_non_grantflow_email(self, mock_logger: Any) -> None:
        """Test that non-grantflow.ai emails are blocked."""

        user_record = Mock(spec=identity_fn.AuthUserRecord)
        user_record.email = "user@gmail.com"
        user_record.uid = "test-uid-123"

        event = Mock(spec=identity_fn.AuthBlockingEvent)
        event.data = user_record
        event.timestamp = datetime.now(UTC)

        with pytest.raises(https_fn.HttpsError) as exc_info:
            before_sign_in(event)

        assert exc_info.value.code == https_fn.FunctionsErrorCode.PERMISSION_DENIED
        assert "Access restricted to grantflow.ai team members only" in str(exc_info.value.message)

        mock_logger.warning.assert_called()
