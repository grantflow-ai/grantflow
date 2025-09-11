from collections.abc import AsyncIterator, Generator
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from litestar import Litestar
from litestar.di import Provide
from litestar.status_codes import HTTP_201_CREATED, HTTP_401_UNAUTHORIZED, HTTP_500_INTERNAL_SERVER_ERROR
from litestar.testing import AsyncTestClient
from packages.db.src.enums import UserRoleEnum
from packages.db.src.tables import Organization, OrganizationUser
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker


@pytest.fixture
def mock_firebase_delete_user() -> Generator[AsyncMock]:
    with patch("services.backend.src.api.webhooks.entity_cleanup.delete_user") as mock:
        yield mock


@pytest.fixture
def mock_firebase_user_not_found_error() -> Generator[AsyncMock]:
    with patch(
        "services.backend.src.api.webhooks.entity_cleanup.delete_user",
        return_value=None,
    ) as mock:
        yield mock


@pytest.fixture
async def entity_cleanup_test_client(
    async_session_maker: async_sessionmaker[Any],
) -> AsyncIterator[AsyncTestClient[Any]]:
    from services.backend.src.api.middleware import AuthMiddleware
    from services.backend.src.api.webhooks.entity_cleanup import handle_entity_cleanup_webhook

    def provide_session_maker() -> async_sessionmaker[Any]:
        return async_session_maker

    app = Litestar(
        route_handlers=[handle_entity_cleanup_webhook],
        middleware=[AuthMiddleware],
        debug=True,
        dependencies={"session_maker": Provide(provide_session_maker, sync_to_thread=False)},
    )

    async with AsyncTestClient(app=app, raise_server_exceptions=False) as client:
        with patch("services.backend.src.api.middleware.get_env") as mock_get_env:
            mock_get_env.return_value = "test-webhook-token"
            yield client


@pytest.fixture
async def expired_user(
    async_session_maker: async_sessionmaker[Any],
    organization: Organization,
) -> OrganizationUser:
    async with async_session_maker() as session:
        user = OrganizationUser(
            firebase_uid=f"expired-user-{uuid4().hex[:8]}",
            organization_id=organization.id,
            role=UserRoleEnum.COLLABORATOR,
        )
        session.add(user)
        await session.commit()

        await session.execute(
            text("UPDATE organization_users SET deleted_at = NOW() - INTERVAL '15 days' WHERE firebase_uid = :uid"),
            {"uid": user.firebase_uid},
        )
        await session.commit()
        await session.refresh(user)
        return user


@pytest.fixture
async def recently_deleted_user(
    async_session_maker: async_sessionmaker[Any],
    organization: Organization,
) -> OrganizationUser:
    async with async_session_maker() as session:
        user = OrganizationUser(
            firebase_uid=f"recent-user-{uuid4().hex[:8]}",
            organization_id=organization.id,
            role=UserRoleEnum.COLLABORATOR,
        )
        session.add(user)
        await session.commit()

        await session.execute(
            text("UPDATE organization_users SET deleted_at = NOW() - INTERVAL '5 days' WHERE firebase_uid = :uid"),
            {"uid": user.firebase_uid},
        )
        await session.commit()
        await session.refresh(user)
        return user


@pytest.fixture
async def expired_organization(
    async_session_maker: async_sessionmaker[Any],
) -> Organization:
    async with async_session_maker() as session:
        org = Organization(
            id=uuid4(),
            name=f"Expired Org {uuid4().hex[:8]}",
            deleted_at=datetime.now(UTC) - timedelta(days=35),
        )
        session.add(org)
        await session.commit()
        return org


@pytest.fixture
async def recently_deleted_organization(
    async_session_maker: async_sessionmaker[Any],
) -> Organization:
    async with async_session_maker() as session:
        org = Organization(
            id=uuid4(),
            name=f"Recent Org {uuid4().hex[:8]}",
            deleted_at=datetime.now(UTC) - timedelta(days=15),
        )
        session.add(org)
        await session.commit()
        return org


async def test_entity_cleanup_webhook_unauthorized(
    entity_cleanup_test_client: AsyncTestClient[Any],
) -> None:
    response = await entity_cleanup_test_client.post(
        "/webhooks/scheduler/entity-cleanup",
        headers={"Authorization": "wrong-token"},
    )
    assert response.status_code == HTTP_401_UNAUTHORIZED


async def test_entity_cleanup_webhook_no_expired_entities(
    entity_cleanup_test_client: AsyncTestClient[Any],
    mock_firebase_delete_user: AsyncMock,
) -> None:
    response = await entity_cleanup_test_client.post(
        "/webhooks/scheduler/entity-cleanup",
        headers={"Authorization": "test-webhook-token"},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "success"
    assert data["users_processed"] == 0
    assert data["organizations_processed"] == 0
    assert data["total_errors"] == 0

    mock_firebase_delete_user.assert_not_called()


async def test_entity_cleanup_webhook_expired_user_success(
    entity_cleanup_test_client: AsyncTestClient[Any],
    expired_user: OrganizationUser,
    mock_firebase_delete_user: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await entity_cleanup_test_client.post(
        "/webhooks/scheduler/entity-cleanup",
        headers={"Authorization": "test-webhook-token"},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "success"
    assert data["users_processed"] == 1
    assert data["total_errors"] == 0

    mock_firebase_delete_user.assert_called_once_with(expired_user.firebase_uid)

    async with async_session_maker() as session:
        result = await session.execute(
            text("SELECT COUNT(*) FROM organization_users WHERE firebase_uid = :uid"),
            {"uid": expired_user.firebase_uid},
        )
        count = result.scalar()
        assert count == 0


async def test_entity_cleanup_webhook_expired_user_firebase_not_found(
    entity_cleanup_test_client: AsyncTestClient[Any],
    expired_user: OrganizationUser,
    mock_firebase_user_not_found_error: AsyncMock,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await entity_cleanup_test_client.post(
        "/webhooks/scheduler/entity-cleanup",
        headers={"Authorization": "test-webhook-token"},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "success"
    assert data["users_processed"] == 1
    assert data["total_errors"] == 0

    mock_firebase_user_not_found_error.assert_called_once_with(expired_user.firebase_uid)

    async with async_session_maker() as session:
        result = await session.execute(
            text("SELECT COUNT(*) FROM organization_users WHERE firebase_uid = :uid"),
            {"uid": expired_user.firebase_uid},
        )
        count = result.scalar()
        assert count == 0


async def test_entity_cleanup_webhook_expired_user_firebase_error(
    entity_cleanup_test_client: AsyncTestClient[Any],
    expired_user: OrganizationUser,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    with patch(
        "services.backend.src.api.webhooks.entity_cleanup.delete_user",
        side_effect=Exception("Firebase service error"),
    ):
        response = await entity_cleanup_test_client.post(
            "/webhooks/scheduler/entity-cleanup",
            headers={"Authorization": "test-webhook-token"},
        )

        assert response.status_code == HTTP_201_CREATED
        data = response.json()
        assert data["status"] == "success"
        assert data["users_processed"] == 0
        assert data["total_errors"] == 1

        async with async_session_maker() as session:
            result = await session.execute(
                text("SELECT COUNT(*) FROM organization_users WHERE firebase_uid = :uid"),
                {"uid": expired_user.firebase_uid},
            )
            count = result.scalar()
            assert count == 1


async def test_entity_cleanup_webhook_recently_deleted_user_not_processed(
    entity_cleanup_test_client: AsyncTestClient[Any],
    recently_deleted_user: OrganizationUser,
    mock_firebase_delete_user: AsyncMock,
) -> None:
    response = await entity_cleanup_test_client.post(
        "/webhooks/scheduler/entity-cleanup",
        headers={"Authorization": "test-webhook-token"},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "success"
    assert data["users_processed"] == 0

    mock_firebase_delete_user.assert_not_called()


async def test_entity_cleanup_webhook_expired_organization_success(
    entity_cleanup_test_client: AsyncTestClient[Any],
    expired_organization: Organization,
    async_session_maker: async_sessionmaker[Any],
) -> None:
    response = await entity_cleanup_test_client.post(
        "/webhooks/scheduler/entity-cleanup",
        headers={"Authorization": "test-webhook-token"},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "success"
    assert data["organizations_processed"] == 1
    assert data["total_errors"] == 0

    async with async_session_maker() as session:
        result = await session.execute(
            text("SELECT COUNT(*) FROM organizations WHERE id = :org_id"),
            {"org_id": str(expired_organization.id)},
        )
        count = result.scalar()
        assert count == 0


async def test_entity_cleanup_webhook_recently_deleted_organization_not_processed(
    entity_cleanup_test_client: AsyncTestClient[Any],
    recently_deleted_organization: Organization,
) -> None:
    response = await entity_cleanup_test_client.post(
        "/webhooks/scheduler/entity-cleanup",
        headers={"Authorization": "test-webhook-token"},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "success"
    assert data["organizations_processed"] == 0


async def test_entity_cleanup_webhook_mixed_entities(
    entity_cleanup_test_client: AsyncTestClient[Any],
    expired_user: OrganizationUser,
    recently_deleted_user: OrganizationUser,
    expired_organization: Organization,
    recently_deleted_organization: Organization,
    mock_firebase_delete_user: AsyncMock,
) -> None:
    response = await entity_cleanup_test_client.post(
        "/webhooks/scheduler/entity-cleanup",
        headers={"Authorization": "test-webhook-token"},
    )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "success"
    assert data["users_processed"] == 1
    assert data["organizations_processed"] == 1
    assert data["total_errors"] == 0

    mock_firebase_delete_user.assert_called_once_with(expired_user.firebase_uid)


async def test_entity_cleanup_webhook_database_error(
    entity_cleanup_test_client: AsyncTestClient[Any],
) -> None:
    with patch(
        "services.backend.src.api.webhooks.entity_cleanup._cleanup_expired_users",
        side_effect=Exception("Database connection failed"),
    ):
        response = await entity_cleanup_test_client.post(
            "/webhooks/scheduler/entity-cleanup",
            headers={"Authorization": "test-webhook-token"},
        )

        assert response.status_code == HTTP_500_INTERNAL_SERVER_ERROR
        data = response.json()
        assert data["status"] == "error"
        assert data["users_processed"] == 0
        assert data["organizations_processed"] == 0
        assert data["total_errors"] == 1


@pytest.mark.parametrize(
    ("grace_period_days", "should_be_processed"),
    [
        ("5", True),
        ("20", False),
    ],
)
async def test_entity_cleanup_webhook_custom_user_grace_period(
    entity_cleanup_test_client: AsyncTestClient[Any],
    expired_user: OrganizationUser,
    mock_firebase_delete_user: AsyncMock,
    grace_period_days: str,
    should_be_processed: bool,
) -> None:
    with patch("services.backend.src.api.webhooks.entity_cleanup.get_env") as mock_get_env:
        mock_get_env.return_value = grace_period_days

        response = await entity_cleanup_test_client.post(
            "/webhooks/scheduler/entity-cleanup",
            headers={"Authorization": "test-webhook-token"},
        )

        assert response.status_code == HTTP_201_CREATED
        data = response.json()
        assert data["status"] == "success"

        if should_be_processed:
            assert data["users_processed"] == 1
            mock_firebase_delete_user.assert_called_once()
        else:
            assert data["users_processed"] == 0
            mock_firebase_delete_user.assert_not_called()


@pytest.mark.parametrize(
    ("grace_period_days", "should_be_processed"),
    [
        ("20", True),
        ("40", False),
    ],
)
async def test_entity_cleanup_webhook_custom_organization_grace_period(
    entity_cleanup_test_client: AsyncTestClient[Any],
    expired_organization: Organization,
    grace_period_days: str,
    should_be_processed: bool,
) -> None:
    with patch("services.backend.src.api.webhooks.entity_cleanup.get_env") as mock_get_env:

        def mock_env(key: str, fallback: bool = True) -> str | None:
            if key == "ORGANIZATION_DELETION_GRACE_PERIOD_DAYS":
                return grace_period_days
            return "10" if key == "USER_DELETION_GRACE_PERIOD_DAYS" else None

        mock_get_env.side_effect = mock_env

        response = await entity_cleanup_test_client.post(
            "/webhooks/scheduler/entity-cleanup",
            headers={"Authorization": "test-webhook-token"},
        )

        assert response.status_code == HTTP_201_CREATED
        data = response.json()
        assert data["status"] == "success"

        if should_be_processed:
            assert data["organizations_processed"] == 1
        else:
            assert data["organizations_processed"] == 0


async def test_login_restoration_and_webhook_cleanup_integration(
    async_session_maker: async_sessionmaker[Any],
    organization: Organization,
    mock_firebase_delete_user: AsyncMock,
) -> None:
    from datetime import UTC, datetime

    from services.backend.src.api.webhooks.entity_cleanup import _cleanup_expired_users

    firebase_uid = f"integration-test-{uuid4().hex[:8]}"

    async with async_session_maker() as session, session.begin():
        user = OrganizationUser(
            firebase_uid=firebase_uid,
            organization_id=organization.id,
            role=UserRoleEnum.COLLABORATOR,
        )
        session.add(user)
        await session.flush()

        await session.execute(
            text("UPDATE organization_users SET deleted_at = NOW() - INTERVAL '5 days' WHERE firebase_uid = :uid"),
            {"uid": firebase_uid},
        )

    async with async_session_maker() as session, session.begin():
        soft_deleted_users = await session.execute(
            select(OrganizationUser).where(
                OrganizationUser.firebase_uid == firebase_uid, OrganizationUser.deleted_at.isnot(None)
            )
        )
        soft_deleted_list = soft_deleted_users.scalars().all()

        if soft_deleted_list:
            from sqlalchemy import update

            await session.execute(
                update(OrganizationUser).where(OrganizationUser.firebase_uid == firebase_uid).values(deleted_at=None)
            )

    async with async_session_maker() as session:
        restored_user = await session.scalar(
            select(OrganizationUser).where(
                OrganizationUser.firebase_uid == firebase_uid, OrganizationUser.deleted_at.is_(None)
            )
        )
        assert restored_user is not None, "User should be restored after login"

    async with async_session_maker() as session, session.begin():
        await session.execute(
            text("UPDATE organization_users SET deleted_at = NOW() - INTERVAL '15 days' WHERE firebase_uid = :uid"),
            {"uid": firebase_uid},
        )

    cleanup_results = await _cleanup_expired_users(async_session_maker, datetime.now(UTC).replace(tzinfo=None))

    assert cleanup_results["processed"] == 1
    assert cleanup_results["errors"] == []

    mock_firebase_delete_user.assert_called_once_with(firebase_uid)

    async with async_session_maker() as session:
        deleted_user = await session.scalar(
            select(OrganizationUser).where(OrganizationUser.firebase_uid == firebase_uid)
        )
        assert deleted_user is None, "User should be completely removed after webhook cleanup"
