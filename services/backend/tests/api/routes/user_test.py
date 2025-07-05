from datetime import UTC, datetime, timedelta
from http import HTTPStatus
from typing import Any

from packages.db.src.tables import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from services.backend.tests.conftest import TestingClientType


async def test_get_user_profile_not_found(
    test_client: TestingClientType,
) -> None:
    """Test getting profile for non-existent user."""
    response = await test_client.get(
        "/user/profile",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "User not found" in response.text


async def test_get_user_profile_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test successfully getting user profile."""
    firebase_uid = "a" * 128

    
    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        user = result.scalar_one()

        user.email = "test@example.com"
        user.display_name = "Test User"
        user.photo_url = "https://example.com/photo.jpg"
        user.preferences = {"theme": "dark", "notifications": True}

        await session.commit()

    response = await test_client.get(
        "/user/profile",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()

    assert data["firebase_uid"] == firebase_uid
    assert data["email"] == "test@example.com"
    assert data["display_name"] == "Test User"
    assert data["photo_url"] == "https://example.com/photo.jpg"
    assert data["preferences"]["theme"] == "dark"
    assert data["preferences"]["notifications"] is True
    assert "created_at" in data
    assert "updated_at" in data


async def test_get_user_profile_minimal_data(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test getting profile with minimal user data."""
    firebase_uid = "a" * 128

    

    response = await test_client.get(
        "/user/profile",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()

    assert data["firebase_uid"] == firebase_uid
    assert "created_at" in data
    assert "updated_at" in data
    
    assert "email" not in data
    assert "display_name" not in data
    assert "photo_url" not in data
    assert "preferences" not in data


async def test_get_user_profile_deleted_user(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test that deleted users are not found."""
    firebase_uid = "a" * 128

    
    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        user = result.scalar_one()

        user.deleted_at = datetime.now(UTC)

        await session.commit()

    response = await test_client.get(
        "/user/profile",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "User not found" in response.text


async def test_update_user_profile_not_found(
    test_client: TestingClientType,
) -> None:
    """Test updating profile for non-existent user."""
    response = await test_client.patch(
        "/user/profile",
        headers={"Authorization": "Bearer some_token"},
        json={"display_name": "New Name"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "User not found" in response.text


async def test_update_user_profile_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test successfully updating user profile."""
    firebase_uid = "a" * 128

    
    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        user = result.scalar_one()

        user.display_name = "Old Name"
        user.preferences = {"theme": "light"}

        await session.commit()

    response = await test_client.patch(
        "/user/profile",
        headers={"Authorization": "Bearer some_token"},
        json={
            "display_name": "New Name",
            "preferences": {"theme": "dark", "language": "en"},
        },
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()

    assert data["success"] is True
    assert data["user"]["firebase_uid"] == firebase_uid
    assert data["user"]["display_name"] == "New Name"
    assert data["user"]["preferences"]["theme"] == "dark"
    assert data["user"]["preferences"]["language"] == "en"

    
    async with async_session_maker() as session:
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        updated_user = result.scalar_one()
        assert updated_user.display_name == "New Name"
        assert updated_user.preferences["theme"] == "dark"
        assert updated_user.preferences["language"] == "en"


async def test_update_user_profile_partial(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test updating only some profile fields."""
    firebase_uid = "a" * 128

    
    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        user = result.scalar_one()

        user.display_name = "Original Name"
        user.preferences = {"theme": "light", "existing": "value"}

        await session.commit()

    
    response = await test_client.patch(
        "/user/profile",
        headers={"Authorization": "Bearer some_token"},
        json={"preferences": {"theme": "dark", "new_setting": True}},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()

    assert data["success"] is True
    assert data["user"]["display_name"] == "Original Name"  
    assert data["user"]["preferences"]["theme"] == "dark"
    assert data["user"]["preferences"]["new_setting"] is True

    
    assert "existing" not in data["user"]["preferences"]


async def test_delete_account_not_found(
    test_client: TestingClientType,
) -> None:
    """Test deleting account for non-existent user."""
    response = await test_client.delete(
        "/user/account",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "User not found" in response.text


async def test_delete_account_success(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test successfully scheduling account deletion."""
    firebase_uid = "a" * 128

    
    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        user = result.scalar_one()

        user.email = "test@example.com"

        await session.commit()

    before_delete = datetime.now(UTC)

    response = await test_client.delete(
        "/user/account",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()

    assert data["success"] is True
    assert data["days_remaining"] == 7

    
    deletion_time = datetime.fromisoformat(
        data["deletion_scheduled_at"].replace("Z", "+00:00")
    )
    expected_time = before_delete + timedelta(days=7)
    time_diff = abs((deletion_time - expected_time).total_seconds())
    assert time_diff < 60  

    
    async with async_session_maker() as session:
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        updated_user = result.scalar_one()
        assert updated_user.deletion_scheduled_at is not None
        assert updated_user.deleted_at is None  


async def test_delete_account_already_deleted(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test that deleted users cannot schedule deletion again."""
    firebase_uid = "a" * 128

    
    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        user = result.scalar_one()

        user.deleted_at = datetime.now(UTC)

        await session.commit()

    response = await test_client.delete(
        "/user/account",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "User not found" in response.text


async def test_get_account_status_not_found(
    test_client: TestingClientType,
) -> None:
    """Test getting status for non-existent user."""
    response = await test_client.get(
        "/user/account/status",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.NOT_FOUND
    assert "User not found" in response.text


async def test_get_account_status_active(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test getting status for active user."""

    

    response = await test_client.get(
        "/user/account/status",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()

    assert data["deleted"] is False
    assert "deletion_scheduled_at" not in data
    assert "days_remaining" not in data


async def test_get_account_status_deleted(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test getting status for deleted user."""
    firebase_uid = "a" * 128

    
    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        user = result.scalar_one()

        user.deleted_at = datetime.now(UTC)

        await session.commit()

    response = await test_client.get(
        "/user/account/status",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()

    assert data["deleted"] is True
    assert "deletion_scheduled_at" not in data
    assert "days_remaining" not in data


async def test_get_account_status_scheduled_for_deletion(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test getting status for user scheduled for deletion."""
    firebase_uid = "a" * 128

    
    deletion_time = datetime.now(UTC) + timedelta(days=5)
    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        user = result.scalar_one()

        user.deletion_scheduled_at = deletion_time

        await session.commit()

    response = await test_client.get(
        "/user/account/status",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()

    assert data["deleted"] is False
    assert "deletion_scheduled_at" in data
    assert data["days_remaining"] in [4, 5]  


async def test_get_account_status_deletion_overdue(
    test_client: TestingClientType,
    async_session_maker: async_sessionmaker[Any],
    project_member_user: None,
) -> None:
    """Test getting status for user whose deletion is overdue."""
    firebase_uid = "a" * 128

    
    deletion_time = datetime.now(UTC) - timedelta(days=1)
    async with async_session_maker() as session, session.begin():
        result = await session.execute(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        user = result.scalar_one()

        user.deletion_scheduled_at = deletion_time

        await session.commit()

    response = await test_client.get(
        "/user/account/status",
        headers={"Authorization": "Bearer some_token"},
    )

    assert response.status_code == HTTPStatus.OK
    data = response.json()

    assert data["deleted"] is False
    assert "deletion_scheduled_at" in data
    assert data["days_remaining"] == 0  


async def test_unauthorized_requests(
    test_client: TestingClientType,
) -> None:
    """Test that all endpoints require authentication."""
    endpoints = [
        ("GET", "/user/profile"),
        ("PATCH", "/user/profile"),
        ("DELETE", "/user/account"),
        ("GET", "/user/account/status"),
    ]

    for method, endpoint in endpoints:
        if method == "GET":
            response = await test_client.get(endpoint)
        elif method == "PATCH":
            response = await test_client.patch(endpoint, json={})
        elif method == "DELETE":
            response = await test_client.delete(endpoint)

        assert response.status_code == HTTPStatus.UNAUTHORIZED, (
            f"Failed for {method} {endpoint}"
        )
