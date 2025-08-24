from collections.abc import AsyncIterator
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from google.cloud.exceptions import GoogleCloudError
from litestar import Litestar
from litestar.status_codes import (
    HTTP_200_OK,
    HTTP_201_CREATED,
    HTTP_400_BAD_REQUEST,
    HTTP_404_NOT_FOUND,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from litestar.testing import AsyncTestClient


@pytest.fixture
def mock_firestore_client() -> AsyncMock:
    mock_client = AsyncMock()
    mock_client.collection = MagicMock()
    return mock_client


@pytest.fixture
async def public_test_client() -> AsyncIterator[AsyncTestClient[Any]]:
    from litestar.testing import AsyncTestClient

    from services.backend.src.api.routes.grants import (
        create_subscription,
        get_grant_details,
        search_grants,
        unsubscribe,
        verify_subscription,
    )

    app = Litestar(
        route_handlers=[
            search_grants,
            get_grant_details,
            create_subscription,
            verify_subscription,
            unsubscribe,
        ],
        debug=True,
    )

    async with AsyncTestClient(app=app, raise_server_exceptions=True) as client:
        yield client


@pytest.fixture
def mock_grant_docs() -> list[MagicMock]:
    docs = []
    for i in range(3):
        mock_doc = MagicMock()
        mock_doc.id = f"PA-24-{i:03d}"
        mock_doc.exists = True
        mock_doc.to_dict.return_value = {
            "title": f"Test Grant {i}",
            "description": f"Description for grant {i}",
            "url": f"https://grants.nih.gov/grants/guide/pa-files/PA-24-{i:03d}",
            "deadline": "2024-12-31",
            "amount": "$100,000 - $500,000",
            "category": "Research",
            "eligibility": "Academic institutions",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }
        docs.append(mock_doc)
    return docs


async def test_search_grants_no_filters(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock, mock_grant_docs: list[MagicMock]
) -> None:
    async def mock_stream() -> AsyncIterator[MagicMock]:
        for doc in mock_grant_docs:
            yield doc

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream()
    mock_query.order_by.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.offset.return_value = mock_query

    mock_collection = MagicMock()
    mock_collection.where.return_value = mock_query
    mock_collection.order_by.return_value = mock_query
    mock_collection.limit.return_value = mock_query
    mock_collection.offset.return_value = mock_query
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get("/grants")

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 3
    assert data[0]["id"] == "PA-24-000"
    assert data[0]["title"] == "Test Grant 0"


async def test_search_grants_with_query(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock, mock_grant_docs: list[MagicMock]
) -> None:
    async def mock_stream() -> AsyncIterator[MagicMock]:
        for doc in mock_grant_docs:
            yield doc

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream()
    mock_query.order_by = MagicMock(return_value=mock_query)
    mock_query.limit = MagicMock(return_value=mock_query)
    mock_query.offset = MagicMock(return_value=mock_query)

    mock_collection = MagicMock()
    mock_collection.order_by = MagicMock(return_value=mock_query)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get("/grants", params={"search_query": "Grant 1"})

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "PA-24-001"
    assert data[0]["title"] == "Test Grant 1"


async def test_search_grants_with_category_filter(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock, mock_grant_docs: list[MagicMock]
) -> None:
    async def mock_stream() -> AsyncIterator[MagicMock]:
        for doc in mock_grant_docs:
            yield doc

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream()
    mock_query.order_by = MagicMock(return_value=mock_query)
    mock_query.limit = MagicMock(return_value=mock_query)
    mock_query.offset = MagicMock(return_value=mock_query)
    mock_query.where = MagicMock(return_value=mock_query)

    mock_collection = MagicMock()
    mock_collection.where = MagicMock(return_value=mock_query)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get("/grants", params={"category": "Research"})

    assert response.status_code == HTTP_200_OK
    mock_collection.where.assert_called_once_with("category", "==", "Research")


async def test_search_grants_with_amount_filters(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock, mock_grant_docs: list[MagicMock]
) -> None:
    async def mock_stream() -> AsyncIterator[MagicMock]:
        for doc in mock_grant_docs:
            yield doc

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream()
    mock_query.order_by = MagicMock(return_value=mock_query)
    mock_query.limit = MagicMock(return_value=mock_query)
    mock_query.offset = MagicMock(return_value=mock_query)
    mock_query.where = MagicMock(return_value=mock_query)

    mock_collection = MagicMock()
    mock_collection.where = MagicMock(return_value=mock_query)
    mock_collection.order_by = MagicMock(return_value=mock_query)
    mock_collection.limit = MagicMock(return_value=mock_query)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get("/grants", params={"min_amount": 100000, "max_amount": 500000})

    assert response.status_code == HTTP_200_OK
    assert mock_collection.where.call_count == 1
    assert mock_query.where.call_count == 1
    mock_collection.where.assert_called_once_with("amount_min", ">=", 100000)
    mock_query.where.assert_called_once_with("amount_max", "<=", 500000)


async def test_search_grants_with_pagination(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock, mock_grant_docs: list[MagicMock]
) -> None:
    async def mock_stream() -> AsyncIterator[MagicMock]:
        yield mock_grant_docs[1]

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream()
    mock_query.order_by = MagicMock(return_value=mock_query)
    mock_query.limit = MagicMock(return_value=mock_query)
    mock_query.offset = MagicMock(return_value=mock_query)

    mock_collection = MagicMock()
    mock_collection.order_by = MagicMock(return_value=mock_query)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get("/grants", params={"limit": 1, "offset": 1})

    assert response.status_code == HTTP_200_OK
    mock_query.limit.assert_called_once_with(1)
    mock_query.offset.assert_called_once_with(1)


async def test_get_grant_details_success(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock, mock_grant_docs: list[MagicMock]
) -> None:
    mock_doc = mock_grant_docs[0]
    mock_doc_ref = MagicMock()
    mock_doc_ref.get = AsyncMock(return_value=mock_doc)

    mock_collection = MagicMock()
    mock_collection.document.return_value = mock_doc_ref
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get("/grants/PA-24-000")

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert data["id"] == "PA-24-000"
    assert data["title"] == "Test Grant 0"


async def test_get_grant_details_not_found(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock
) -> None:
    mock_doc = MagicMock()
    mock_doc.exists = False
    mock_doc_ref = MagicMock()
    mock_doc_ref.get = AsyncMock(return_value=mock_doc)

    mock_collection = MagicMock()
    mock_collection.document.return_value = mock_doc_ref
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get("/grants/NONEXISTENT")

    assert response.status_code == HTTP_404_NOT_FOUND
    data = response.json()
    assert data["error"] == "Grant not found"


async def test_create_subscription_success(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock
) -> None:
    async def mock_stream_empty() -> AsyncIterator[Any]:
        if False:
            yield

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream_empty()
    mock_query.limit = MagicMock(return_value=mock_query)

    mock_doc_ref = MagicMock()
    mock_doc_ref.id = "sub-123"

    mock_collection = MagicMock()
    mock_collection.where = MagicMock(return_value=mock_query)
    mock_collection.add = AsyncMock(return_value=mock_doc_ref)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.post(
            "/grants/subscribe",
            json={
                "email": "test@example.com",
                "search_params": {"category": "Research"},
                "frequency": "daily",
            },
        )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["subscription_id"] == "sub-123"
    assert data["verification_required"] is True
    assert "check your email" in data["message"]


async def test_create_subscription_invalid_email(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock
) -> None:
    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.post(
            "/grants/subscribe",
            json={
                "email": "invalid-email",
                "search_params": {"category": "Research"},
            },
        )

    assert response.status_code == HTTP_400_BAD_REQUEST
    data = response.json()
    assert data["error"] == "Invalid email format"


async def test_create_subscription_invalid_frequency(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock
) -> None:
    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.post(
            "/grants/subscribe",
            json={
                "email": "test@example.com",
                "search_params": {"category": "Research"},
                "frequency": "hourly",
            },
        )

    assert response.status_code == HTTP_400_BAD_REQUEST
    data = response.json()
    assert "Invalid frequency" in data["error"]


async def test_create_subscription_update_existing(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock
) -> None:
    mock_existing_doc = MagicMock()
    mock_existing_doc.id = "existing-sub-123"
    mock_existing_doc.reference.update = AsyncMock()

    async def mock_stream_existing() -> AsyncIterator[MagicMock]:
        yield mock_existing_doc

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream_existing()
    mock_query.limit = MagicMock(return_value=mock_query)

    mock_collection = MagicMock()
    mock_collection.where = MagicMock(return_value=mock_query)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.post(
            "/grants/subscribe",
            json={
                "email": "test@example.com",
                "search_params": {"category": "Research"},
                "frequency": "weekly",
            },
        )

    assert response.status_code == HTTP_201_CREATED
    data = response.json()
    assert data["subscription_id"] == "existing-sub-123"
    mock_existing_doc.reference.update.assert_called_once()


async def test_verify_subscription_success(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock
) -> None:
    mock_doc = MagicMock()
    mock_doc.id = "sub-123"
    mock_doc.reference.update = AsyncMock()

    async def mock_stream() -> AsyncIterator[MagicMock]:
        yield mock_doc

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream()
    mock_query.limit = MagicMock(return_value=mock_query)

    mock_collection = MagicMock()
    mock_collection.where = MagicMock(return_value=mock_query)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get("/grants/verify/test-token-123")

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert "verified successfully" in data["message"]
    mock_doc.reference.update.assert_called_once()


async def test_verify_subscription_invalid_token(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock
) -> None:
    async def mock_stream_empty() -> AsyncIterator[Any]:
        if False:
            yield

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream_empty()
    mock_query.limit = MagicMock(return_value=mock_query)

    mock_collection = MagicMock()
    mock_collection.where = MagicMock(return_value=mock_query)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get("/grants/verify/invalid-token")

    assert response.status_code == HTTP_400_BAD_REQUEST
    data = response.json()
    assert "Invalid or expired" in data["error"]


async def test_unsubscribe_success(public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock) -> None:
    mock_doc = MagicMock()
    mock_doc.reference.delete = AsyncMock()

    async def mock_stream() -> AsyncIterator[MagicMock]:
        yield mock_doc

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream()
    mock_query.limit = MagicMock(return_value=mock_query)

    mock_collection = MagicMock()
    mock_collection.where = MagicMock(return_value=mock_query)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.post(
            "/grants/unsubscribe",
            params={"email": "test@example.com"},
        )

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert "Successfully unsubscribed" in data["message"]
    mock_doc.reference.delete.assert_called_once()


async def test_unsubscribe_no_subscription(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock
) -> None:
    async def mock_stream_empty() -> AsyncIterator[Any]:
        if False:
            yield

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream_empty()
    mock_query.limit = MagicMock(return_value=mock_query)

    mock_collection = MagicMock()
    mock_collection.where = MagicMock(return_value=mock_query)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.post(
            "/grants/unsubscribe",
            params={"email": "test@example.com"},
        )

    assert response.status_code == HTTP_200_OK
    data = response.json()
    assert "No subscription found" in data["message"]


async def test_search_grants_limit_enforcement(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock
) -> None:
    async def mock_stream() -> AsyncIterator[Any]:
        if False:
            yield

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream()
    mock_query.order_by = MagicMock(return_value=mock_query)
    mock_query.limit = MagicMock(return_value=mock_query)
    mock_query.offset = MagicMock(return_value=mock_query)

    mock_collection = MagicMock()
    mock_collection.order_by = MagicMock(return_value=mock_query)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get("/grants", params={"limit": 200})

    assert response.status_code == HTTP_200_OK
    mock_query.limit.assert_called_once_with(100)


async def test_search_grants_firestore_error(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock
) -> None:
    mock_firestore_client.collection.side_effect = GoogleCloudError("Firestore connection failed")

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get("/grants")

    assert response.status_code == HTTP_500_INTERNAL_SERVER_ERROR
    data = response.json()
    assert data["error"] == "Search service temporarily unavailable"


async def test_get_grant_details_firestore_error(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock
) -> None:
    mock_doc_ref = MagicMock()
    mock_doc_ref.get = AsyncMock(side_effect=GoogleCloudError("Firestore connection failed"))

    mock_collection = MagicMock()
    mock_collection.document.return_value = mock_doc_ref
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get("/grants/PA-24-000")

    assert response.status_code >= 400


async def test_create_subscription_firestore_error(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock
) -> None:
    mock_firestore_client.collection.side_effect = GoogleCloudError("Firestore connection failed")

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.post(
            "/grants/subscribe",
            json={
                "email": "test@example.com",
                "search_params": {"category": "Research"},
                "frequency": "daily",
            },
        )

    assert response.status_code == HTTP_500_INTERNAL_SERVER_ERROR
    data = response.json()
    assert data["error"] == "Subscription service temporarily unavailable"


async def test_search_grants_with_deadline_filters(
    public_test_client: AsyncTestClient[Any], mock_firestore_client: AsyncMock, mock_grant_docs: list[MagicMock]
) -> None:
    async def mock_stream() -> AsyncIterator[MagicMock]:
        for doc in mock_grant_docs:
            yield doc

    mock_query = MagicMock()
    mock_query.stream.return_value = mock_stream()
    mock_query.order_by = MagicMock(return_value=mock_query)
    mock_query.limit = MagicMock(return_value=mock_query)
    mock_query.offset = MagicMock(return_value=mock_query)
    mock_query.where = MagicMock(return_value=mock_query)

    mock_collection = MagicMock()
    mock_collection.where = MagicMock(return_value=mock_query)
    mock_collection.order_by = MagicMock(return_value=mock_query)
    mock_collection.limit = MagicMock(return_value=mock_query)
    mock_collection.offset = MagicMock(return_value=mock_query)
    mock_firestore_client.collection.return_value = mock_collection

    with patch("services.backend.src.api.routes.grants.get_firestore_client", return_value=mock_firestore_client):
        response = await public_test_client.get(
            "/grants", params={"deadline_after": "2024-01-01", "deadline_before": "2024-12-31"}
        )

    assert response.status_code == HTTP_200_OK
    assert mock_query.where.call_count >= 1
    calls = [str(call) for call in mock_query.where.call_args_list]
    deadline_calls = [call for call in calls if "deadline" in call]
    assert len(deadline_calls) >= 1


async def test_create_subscription_missing_email(public_test_client: AsyncTestClient[Any]) -> None:
    response = await public_test_client.post(
        "/grants/subscribe",
        json={
            "search_params": {"category": "Research"},
            "frequency": "daily",
        },
    )
    assert response.status_code == HTTP_400_BAD_REQUEST


async def test_unsubscribe_missing_email(public_test_client: AsyncTestClient[Any]) -> None:
    response = await public_test_client.post("/grants/unsubscribe")
    assert response.status_code == HTTP_400_BAD_REQUEST
