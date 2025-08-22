"""Public grant search API endpoints.

These endpoints are publicly accessible without authentication.
Part of the Grant Finder feature (VSP-281, VSP-282).
"""

from __future__ import annotations

import secrets
from typing import NotRequired, TypedDict

from google.cloud import firestore
from litestar import Response, get, post
from litestar.status_codes import HTTP_200_OK, HTTP_201_CREATED, HTTP_400_BAD_REQUEST
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


class GrantSearchParams(TypedDict):
    """Parameters for grant search."""

    query: NotRequired[str]
    category: NotRequired[str]
    min_amount: NotRequired[int]
    max_amount: NotRequired[int]
    deadline_after: NotRequired[str]
    deadline_before: NotRequired[str]
    limit: NotRequired[int]
    offset: NotRequired[int]


class GrantInfo(TypedDict):
    """Grant information returned from search."""

    id: str
    title: str
    description: NotRequired[str]
    url: NotRequired[str]
    deadline: NotRequired[str]
    amount: NotRequired[str]
    category: NotRequired[str]
    eligibility: NotRequired[str]
    created_at: str
    updated_at: str


class SubscriptionRequest(TypedDict):
    """Request to create an email subscription."""

    email: str
    search_params: GrantSearchParams
    frequency: NotRequired[str]  # daily, weekly


class SubscriptionResponse(TypedDict):
    """Response for subscription creation."""

    subscription_id: str
    verification_required: bool
    message: str


def get_firestore_client() -> firestore.AsyncClient:
    """Get Firestore client instance.

    Returns:
        firestore.AsyncClient: Firestore async client
    """
    project_id = get_env("GCP_PROJECT_ID", fallback="grantflow")
    return firestore.AsyncClient(project=project_id)


@get("/public/grants")
async def search_grants(
    search_query: str | None = None,
    category: str | None = None,
    min_amount: int | None = None,
    max_amount: int | None = None,
    deadline_after: str | None = None,
    deadline_before: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> Response[list[GrantInfo]]:
    """Search for grants in Firestore.

    This is a public endpoint that doesn't require authentication.

    Args:
        search_query: Search query string
        category: Grant category filter
        min_amount: Minimum grant amount
        max_amount: Maximum grant amount
        deadline_after: ISO date string for minimum deadline
        deadline_before: ISO date string for maximum deadline
        limit: Number of results to return (max 100)
        offset: Number of results to skip

    Returns:
        List of grants matching the search criteria
    """
    limit = min(limit, 100)

    logger.info(
        "Public grant search request",
        search_query=search_query,
        category=category,
        min_amount=min_amount,
        max_amount=max_amount,
        limit=limit,
        offset=offset,
    )

    client = get_firestore_client()
    grants_ref = client.collection("grants")

    # Build query
    query_ref = grants_ref

    # Add filters based on search parameters
    if category:
        query_ref = query_ref.where("category", "==", category)

    if min_amount is not None:
        query_ref = query_ref.where("amount_min", ">=", min_amount)

    if max_amount is not None:
        query_ref = query_ref.where("amount_max", "<=", max_amount)

    if deadline_after:
        query_ref = query_ref.where("deadline", ">=", deadline_after)

    if deadline_before:
        query_ref = query_ref.where("deadline", "<=", deadline_before)

    # Apply ordering, limit and offset
    query_ref = query_ref.order_by("created_at", direction=firestore.Query.DESCENDING)
    query_ref = query_ref.limit(limit)

    if offset > 0:
        query_ref = query_ref.offset(offset)

    # Execute query
    docs = query_ref.stream()

    results: list[GrantInfo] = []
    async for doc in docs:
        data = doc.to_dict()

        # If we have a search query, filter by title/description
        # (Firestore doesn't support full-text search natively)
        if search_query:
            query_lower = search_query.lower()
            title_match = query_lower in data.get("title", "").lower()
            desc_match = query_lower in data.get("description", "").lower()
            if not (title_match or desc_match):
                continue

        grant_info: GrantInfo = {
            "id": doc.id,
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "url": data.get("url", ""),
            "deadline": data.get("deadline", ""),
            "amount": data.get("amount", ""),
            "category": data.get("category", ""),
            "eligibility": data.get("eligibility", ""),
            "created_at": data.get("created_at", ""),
            "updated_at": data.get("updated_at", ""),
        }

        results.append(grant_info)

    logger.info("Public grant search completed", result_count=len(results))

    return Response(
        content=results,
        status_code=HTTP_200_OK,
    )


@get("/public/grants/{grant_id:str}")
async def get_grant_details(grant_id: str) -> Response[GrantInfo | dict[str, str]]:
    """Get details for a specific grant.

    This is a public endpoint that doesn't require authentication.

    Args:
        grant_id: Grant document ID

    Returns:
        Grant details
    """
    logger.info("Public grant details request", grant_id=grant_id)

    client = get_firestore_client()
    doc_ref = client.collection("grants").document(grant_id)
    doc = await doc_ref.get()

    if not doc.exists:
        logger.warning("Grant not found", grant_id=grant_id)
        return Response(
            content={"error": "Grant not found"},
            status_code=404,
        )

    data = doc.to_dict()
    grant_info: GrantInfo = {
        "id": doc.id,
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "url": data.get("url", ""),
        "deadline": data.get("deadline", ""),
        "amount": data.get("amount", ""),
        "category": data.get("category", ""),
        "eligibility": data.get("eligibility", ""),
        "created_at": data.get("created_at", ""),
        "updated_at": data.get("updated_at", ""),
    }

    logger.info("Public grant details retrieved", grant_id=grant_id)

    return Response(
        content=grant_info,
        status_code=HTTP_200_OK,
    )


@post("/public/grants/subscribe")
async def create_subscription(data: SubscriptionRequest) -> Response[SubscriptionResponse | dict[str, str]]:
    """Create an email subscription for grant alerts.

    This is a public endpoint that doesn't require authentication.
    Creates a subscription that will be verified via email.

    Args:
        data: Subscription request with email and search parameters

    Returns:
        Subscription response with ID and verification status
    """
    email = data["email"]
    search_params = data["search_params"]
    frequency = data.get("frequency", "daily")

    # Validate email format
    if "@" not in email or "." not in email:
        logger.warning("Invalid email format", email=email)
        return Response(
            content={"error": "Invalid email format"},
            status_code=HTTP_400_BAD_REQUEST,
        )

    # Validate frequency
    if frequency not in ["daily", "weekly"]:
        logger.warning("Invalid frequency", frequency=frequency)
        return Response(
            content={"error": "Invalid frequency. Must be 'daily' or 'weekly'"},
            status_code=HTTP_400_BAD_REQUEST,
        )

    logger.info(
        "Creating grant subscription",
        email=email,
        frequency=frequency,
        search_params=search_params,
    )

    client = get_firestore_client()
    subscriptions_ref = client.collection("subscriptions")

    # Check if subscription already exists for this email
    existing = subscriptions_ref.where("email", "==", email).limit(1).stream()
    existing_docs = [doc async for doc in existing]

    if existing_docs:
        # Update existing subscription
        doc = existing_docs[0]
        await doc.reference.update(
            {
                "search_params": search_params,
                "frequency": frequency,
                "updated_at": firestore.SERVER_TIMESTAMP,
            }
        )
        subscription_id = doc.id
        logger.info("Updated existing subscription", subscription_id=subscription_id)
    else:
        # Create new subscription
        verification_token = secrets.token_urlsafe(32)

        doc_data = {
            "email": email,
            "search_params": search_params,
            "frequency": frequency,
            "verified": False,
            "verification_token": verification_token,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }

        doc_ref = await subscriptions_ref.add(doc_data)
        subscription_id = doc_ref.id

        # TODO: Send verification email via Pub/Sub
        logger.info(
            "Created new subscription",
            subscription_id=subscription_id,
            verification_token=verification_token,
        )

    response: SubscriptionResponse = {
        "subscription_id": subscription_id,
        "verification_required": True,
        "message": "Please check your email to verify your subscription",
    }

    return Response(
        content=response,
        status_code=HTTP_201_CREATED,
    )


@get("/public/grants/verify/{token:str}")
async def verify_subscription(token: str) -> Response[dict[str, str]]:
    """Verify an email subscription.

    This is a public endpoint that doesn't require authentication.

    Args:
        token: Verification token from email

    Returns:
        Verification status message
    """
    logger.info("Verifying subscription", token=token)

    client = get_firestore_client()
    subscriptions_ref = client.collection("subscriptions")

    # Find subscription by token
    query = subscriptions_ref.where("verification_token", "==", token).limit(1)
    docs = query.stream()

    subscription_docs = [doc async for doc in docs]

    if not subscription_docs:
        logger.warning("Invalid verification token", token=token)
        return Response(
            content={"error": "Invalid or expired verification token"},
            status_code=HTTP_400_BAD_REQUEST,
        )

    doc = subscription_docs[0]

    # Update subscription as verified
    await doc.reference.update(
        {
            "verified": True,
            "verification_token": None,
            "verified_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
    )

    logger.info("Subscription verified", subscription_id=doc.id)

    return Response(
        content={"message": "Subscription verified successfully"},
        status_code=HTTP_200_OK,
    )


@post("/public/grants/unsubscribe")
async def unsubscribe(email: str) -> Response[dict[str, str]]:
    """Unsubscribe from grant alerts.

    This is a public endpoint that doesn't require authentication.

    Args:
        email: Email address to unsubscribe

    Returns:
        Unsubscribe status message
    """
    logger.info("Unsubscribing from grant alerts", email=email)

    client = get_firestore_client()
    subscriptions_ref = client.collection("subscriptions")

    # Find subscription by email
    query = subscriptions_ref.where("email", "==", email).limit(1)
    docs = query.stream()

    subscription_docs = [doc async for doc in docs]

    if not subscription_docs:
        logger.warning("No subscription found", email=email)
        return Response(
            content={"message": "No subscription found for this email"},
            status_code=HTTP_200_OK,
        )

    # Delete subscription
    for doc in subscription_docs:
        await doc.reference.delete()

    logger.info("Unsubscribed from grant alerts", email=email, count=len(subscription_docs))

    return Response(
        content={"message": "Successfully unsubscribed from grant alerts"},
        status_code=HTTP_200_OK,
    )
