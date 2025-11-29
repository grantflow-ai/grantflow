"""Firebase mocking utilities for testing."""

from typing import Any


class MockResult:
    """Mock Firebase batch get users result."""

    def __init__(self, users: list[Any]) -> None:
        self.users = users


class MockUser:
    """Mock Firebase user object."""

    def __init__(self, uid: str) -> None:
        self.uid = uid
        self.email = f"test-{uid}@example.com"
        self.display_name = f"Test User {uid}"
        self.photo_url = f"https://example.com/photo-{uid}.jpg"
        self.phone_number = None
        self.email_verified = True
        self.disabled = False
        self.custom_claims: dict[str, Any] = {}
        self.tenant_id = None
        self.provider_data: list[Any] = []
        self.user_metadata = None


async def mock_firebase_get_users(identifiers: list[Any], app: Any = None) -> MockResult:
    """Mock firebase_admin.auth.get_users for testing."""
    users = [MockUser(identifier.uid) for identifier in identifiers]
    return MockResult(users)
