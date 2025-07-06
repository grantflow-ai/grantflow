"""Tests for user cleanup cloud function."""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

import pytest

from src.user_cleanup.main import (
    cleanup_expired_users,
    delete_user_completely,
    delete_user_from_database,
    get_database_url,
    main,
)


class TestMain:
    """Test main entry point."""

    def test_main_calls_cleanup_function(self, mock_request: Mock) -> None:
        """Test that main function calls the cleanup function."""
        with patch("src.user_cleanup.main.cleanup_expired_users") as mock_cleanup:
            mock_cleanup.return_value = {"statusCode": 200, "body": {"processed": 0}}

            with patch("asyncio.run") as mock_run:
                mock_run.return_value = {"statusCode": 200, "body": {"processed": 0}}

                result = main(mock_request)

                mock_run.assert_called_once()
                assert result["statusCode"] == 200


class TestCleanupExpiredUsers:
    """Test cleanup expired users function."""

    async def test_successful_cleanup_no_expired_users(self) -> None:
        """Test successful cleanup when no users are expired."""
        with (
            patch("firebase_admin._apps", [Mock()]),
            patch("src.user_cleanup.main.firestore.AsyncClient") as mock_firestore,
        ):
            mock_db = Mock()
            mock_firestore.return_value = mock_db

            mock_collection = Mock()
            mock_query = Mock()
            mock_db.collection.return_value = mock_collection
            mock_collection.where.return_value = mock_query
            mock_query.where.return_value = mock_query

            async def empty_stream() -> AsyncGenerator[Any]:
                if False:  # pragma: no cover
                    yield

            mock_query.stream.return_value = empty_stream()

            result = await cleanup_expired_users()

            assert result["statusCode"] == 200
            assert result["body"]["processed"] == 0
            assert result["body"]["errors"] == []
            assert result["body"]["deleted_users"] == []

    async def test_successful_cleanup_with_expired_users(self) -> None:
        """Test successful cleanup with expired users."""
        with (
            patch("firebase_admin._apps", [Mock()]),
            patch("src.user_cleanup.main.firestore.AsyncClient") as mock_firestore,
            patch("src.user_cleanup.main.delete_user_completely", new_callable=AsyncMock) as mock_delete,
        ):
            mock_db = Mock()
            mock_firestore.return_value = mock_db

            mock_doc = Mock()
            mock_doc.id = "doc123"
            mock_doc.to_dict.return_value = {
                "firebase_uid": "user123",
                "deletion_date": datetime.now(UTC) - timedelta(days=1),
            }

            mock_collection = Mock()
            mock_query = Mock()
            mock_db.collection.return_value = mock_collection
            mock_collection.where.return_value = mock_query
            mock_query.where.return_value = mock_query

            async def mock_stream() -> AsyncGenerator[Any]:
                yield mock_doc

            mock_query.stream.return_value = mock_stream()

            mock_doc_ref = Mock()
            mock_doc_ref.update = AsyncMock()

            mock_collection.document = Mock(return_value=mock_doc_ref)

            result = await cleanup_expired_users()

            assert result["statusCode"] == 200
            assert result["body"]["processed"] == 1
            assert result["body"]["errors"] == []
            assert result["body"]["deleted_users"] == ["user123"]

            mock_delete.assert_called_once_with("user123")

            mock_doc_ref.update.assert_called_once()

    async def test_cleanup_with_user_deletion_error(self) -> None:
        """Test cleanup when user deletion fails."""
        with (
            patch("firebase_admin._apps", [Mock()]),
            patch("src.user_cleanup.main.firestore.AsyncClient") as mock_firestore,
            patch("src.user_cleanup.main.delete_user_completely") as mock_delete,
        ):
            mock_db = Mock()
            mock_firestore.return_value = mock_db

            mock_doc = Mock()
            mock_doc.id = "doc123"
            mock_doc.to_dict.return_value = {
                "firebase_uid": "user123",
                "deletion_date": datetime.now(UTC) - timedelta(days=1),
            }

            mock_collection = Mock()
            mock_query = Mock()
            mock_db.collection.return_value = mock_collection
            mock_collection.where.return_value = mock_query
            mock_query.where.return_value = mock_query

            async def mock_stream() -> AsyncGenerator[Any]:
                yield mock_doc

            mock_query.stream.return_value = mock_stream()

            mock_delete.side_effect = Exception("Firebase error")

            result = await cleanup_expired_users()

            assert result["statusCode"] == 200
            assert result["body"]["processed"] == 0
            assert len(result["body"]["errors"]) == 1
            assert "Failed to delete user user123" in result["body"]["errors"][0]
            assert result["body"]["deleted_users"] == []

    async def test_cleanup_firebase_initialization(self) -> None:
        """Test Firebase initialization when not already initialized."""
        with (
            patch("firebase_admin._apps", []),
            patch("firebase_admin.initialize_app") as mock_init,
            patch("src.user_cleanup.main.firestore.AsyncClient") as mock_firestore,
        ):
            mock_db = Mock()
            mock_firestore.return_value = mock_db

            mock_collection = Mock()
            mock_query = Mock()
            mock_db.collection.return_value = mock_collection
            mock_collection.where.return_value = mock_query
            mock_query.where.return_value = mock_query

            async def empty_stream() -> AsyncGenerator[Any]:
                if False:  # pragma: no cover
                    yield

            mock_query.stream.return_value = empty_stream()

            result = await cleanup_expired_users()

            mock_init.assert_called_once()
            assert result["statusCode"] == 200

    async def test_cleanup_unexpected_error(self) -> None:
        """Test cleanup with unexpected error."""
        with (
            patch("firebase_admin._apps", [Mock()]),
            patch("src.user_cleanup.main.firestore.AsyncClient") as mock_firestore,
        ):
            mock_firestore.side_effect = Exception("Firestore connection error")

            result = await cleanup_expired_users()

            assert result["statusCode"] == 500
            assert "User cleanup function failed" in result["body"]["error"]


class TestDeleteUserCompletely:
    """Test delete user completely function."""

    async def test_successful_user_deletion(self) -> None:
        """Test successful complete user deletion."""
        with (
            patch("firebase_admin.auth.delete_user") as mock_auth_delete,
            patch("src.user_cleanup.main.delete_user_from_database") as mock_db_delete,
        ):
            mock_auth_delete.return_value = None
            mock_db_delete.return_value = None

            await delete_user_completely("user123")

            mock_auth_delete.assert_called_once_with("user123")
            mock_db_delete.assert_called_once_with("user123")

    async def test_user_deletion_with_auth_error(self) -> None:
        """Test user deletion when Firebase Auth fails."""
        with (
            patch("firebase_admin.auth.delete_user") as mock_auth_delete,
            patch("src.user_cleanup.main.delete_user_from_database") as mock_db_delete,
        ):
            from firebase_admin import auth

            mock_auth_delete.side_effect = auth.UserNotFoundError("User not found")
            mock_db_delete.return_value = None

            await delete_user_completely("user123")

            mock_auth_delete.assert_called_once_with("user123")
            mock_db_delete.assert_called_once_with("user123")

    async def test_user_deletion_with_general_auth_error(self) -> None:
        """Test user deletion with general Firebase Auth error."""
        with (
            patch("firebase_admin.auth.delete_user") as mock_auth_delete,
            patch("src.user_cleanup.main.delete_user_from_database") as mock_db_delete,
        ):
            mock_auth_delete.side_effect = Exception("Firebase error")
            mock_db_delete.return_value = None

            await delete_user_completely("user123")

            mock_auth_delete.assert_called_once_with("user123")
            mock_db_delete.assert_called_once_with("user123")


class TestDeleteUserFromDatabase:
    """Test delete user from database function."""

    async def test_successful_database_deletion(self) -> None:
        """Test successful database user deletion."""
        with (
            patch("src.user_cleanup.main.get_database_url") as mock_get_url,
            patch("src.user_cleanup.main.create_async_engine") as mock_create_engine,
            patch("src.user_cleanup.main.async_sessionmaker") as mock_sessionmaker,
        ):
            mock_get_url.return_value = "postgresql+asyncpg://test:test@localhost:5432/test"

            mock_engine = AsyncMock()
            mock_create_engine.return_value = mock_engine

            mock_session = AsyncMock()
            mock_session.execute = AsyncMock()

            mock_begin_cm = AsyncMock()
            mock_begin_cm.__aenter__ = AsyncMock(return_value=None)
            mock_begin_cm.__aexit__ = AsyncMock(return_value=None)
            mock_session.begin = Mock(return_value=mock_begin_cm)

            mock_session_cm = AsyncMock()
            mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session_cm.__aexit__ = AsyncMock(return_value=None)

            mock_session_maker = Mock()
            mock_session_maker.return_value = mock_session_cm
            mock_sessionmaker.return_value = mock_session_maker

            await delete_user_from_database("user123")

            mock_get_url.assert_called_once()
            mock_create_engine.assert_called_once()
            mock_sessionmaker.assert_called_once_with(mock_engine)
            assert mock_session.execute.call_count == 2
            mock_engine.dispose.assert_called_once()

    async def test_database_deletion_with_error(self) -> None:
        """Test database deletion with error."""
        with (
            patch("src.user_cleanup.main.get_database_url") as mock_get_url,
            patch("src.user_cleanup.main.create_async_engine") as mock_create_engine,
            patch("src.user_cleanup.main.async_sessionmaker") as mock_sessionmaker,
        ):
            mock_get_url.return_value = "postgresql+asyncpg://test:test@localhost:5432/test"

            mock_engine = AsyncMock()
            mock_create_engine.return_value = mock_engine

            mock_session = AsyncMock()
            mock_session.execute = AsyncMock()
            mock_session.execute.side_effect = Exception("Database error")

            mock_begin_cm = AsyncMock()
            mock_begin_cm.__aenter__ = AsyncMock(return_value=None)
            mock_begin_cm.__aexit__ = AsyncMock(return_value=None)
            mock_session.begin = Mock(return_value=mock_begin_cm)

            mock_session_cm = AsyncMock()
            mock_session_cm.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session_cm.__aexit__ = AsyncMock(return_value=None)

            mock_session_maker = Mock()
            mock_session_maker.return_value = mock_session_cm
            mock_sessionmaker.return_value = mock_session_maker

            with pytest.raises(Exception, match="Database error"):
                await delete_user_from_database("user123")

            mock_engine.dispose.assert_called_once()


class TestGetDatabaseUrl:
    """Test get database URL function."""

    def test_cloud_sql_url_construction(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test Cloud SQL URL construction."""

        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "grantflow-test")
        monkeypatch.setenv("CLOUD_SQL_INSTANCE", "test-instance")
        monkeypatch.setenv("DATABASE_NAME", "testdb")
        monkeypatch.setenv("DATABASE_USER", "testuser")
        monkeypatch.setenv("DATABASE_PASSWORD", "testpass")
        monkeypatch.setenv("CLOUD_SQL_REGION", "us-west1")

        url = get_database_url()

        expected = "postgresql+asyncpg://testuser:testpass@/testdb?host=/cloudsql/grantflow-test:us-west1:test-instance"
        assert url == expected

    def test_cloud_sql_url_with_defaults(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test Cloud SQL URL with default values."""

        monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "grantflow-test")
        monkeypatch.setenv("DATABASE_PASSWORD", "testpass")

        url = get_database_url()

        expected = (
            "postgresql+asyncpg://grantflow:testpass@/grantflow?host=/cloudsql/grantflow-test:us-central1:grantflow-db"
        )
        assert url == expected

    def test_local_database_url(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test local database URL fallback."""

        monkeypatch.delenv("GOOGLE_CLOUD_PROJECT", raising=False)
        monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://local:local@localhost:5432/local")

        url = get_database_url()

        assert url == "postgresql+asyncpg://local:local@localhost:5432/local"

    def test_default_local_database_url(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test default local database URL."""

        monkeypatch.delenv("GOOGLE_CLOUD_PROJECT", raising=False)
        monkeypatch.delenv("DATABASE_URL", raising=False)

        url = get_database_url()

        assert url == "postgresql+asyncpg://grantflow:password@localhost:5432/grantflow"
