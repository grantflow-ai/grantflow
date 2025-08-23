import re
import secrets
from typing import NotRequired, TypedDict

from google.cloud import firestore
from google.cloud.exceptions import GoogleCloudError
from litestar import Response, get, post
from litestar.status_codes import (
    HTTP_200_OK,
    HTTP_201_CREATED,
    HTTP_400_BAD_REQUEST,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_subscription_verification_email

logger = get_logger(__name__)


class GrantSearchParams(TypedDict):
    query: NotRequired[str]
    category: NotRequired[str]
    min_amount: NotRequired[int]
    max_amount: NotRequired[int]
    deadline_after: NotRequired[str]
    deadline_before: NotRequired[str]
    limit: NotRequired[int]
    offset: NotRequired[int]


class GrantInfoResponse(TypedDict):
    id: str
    title: str
    release_date: str
    expired_date: str
    activity_code: str
    organization: str
    parent_organization: str
    participating_orgs: str
    document_number: str
    document_type: str
    clinical_trials: str
    url: str
    description: NotRequired[str]
    amount: NotRequired[str]
    amount_min: NotRequired[int]
    amount_max: NotRequired[int]
    category: NotRequired[str]
    eligibility: NotRequired[str]
    deadline: NotRequired[str]


class SubscriptionRequest(TypedDict):
    email: str
    search_params: GrantSearchParams
    frequency: NotRequired[str]


class SubscriptionResponse(TypedDict):
    subscription_id: str
    verification_required: bool
    message: str


def get_firestore_client() -> firestore.AsyncClient:
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
) -> Response[list[GrantInfoResponse] | dict[str, str]]:
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

    try:
        client = get_firestore_client()
        grants_ref = client.collection("grants")

        query_ref = grants_ref

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

        query_ref = query_ref.order_by("created_at", direction=firestore.Query.DESCENDING)
        query_ref = query_ref.limit(limit)

        if offset > 0:
            query_ref = query_ref.offset(offset)

        docs = query_ref.stream()

        results: list[GrantInfoResponse] = []
        async for doc in docs:
            data = doc.to_dict()

            # WARNING: This is client-side filtering which is inefficient for large datasets
            # TODO: For production, implement proper full-text search with:
            if search_query:
                query_lower = search_query.lower()
                title_match = query_lower in data.get("title", "").lower()
                desc_match = query_lower in data.get("description", "").lower()
                if not (title_match or desc_match):
                    continue

            grant_info: GrantInfoResponse = {
                "id": doc.id,
                "title": data.get("title", ""),
                "release_date": data.get("release_date", ""),
                "expired_date": data.get("expired_date", ""),
                "activity_code": data.get("activity_code", ""),
                "organization": data.get("organization", ""),
                "parent_organization": data.get("parent_organization", ""),
                "participating_orgs": data.get("participating_orgs", ""),
                "document_number": data.get("document_number", ""),
                "document_type": data.get("document_type", ""),
                "clinical_trials": data.get("clinical_trials", ""),
                "url": data.get("url", ""),
                "description": data.get("description"),
                "amount": data.get("amount"),
                "amount_min": data.get("amount_min"),
                "amount_max": data.get("amount_max"),
                "category": data.get("category"),
                "eligibility": data.get("eligibility"),
                "deadline": data.get("deadline"),
            }

            results.append(grant_info)

        logger.info("Public grant search completed", result_count=len(results))

        return Response(
            content=results,
            status_code=HTTP_200_OK,
        )

    except GoogleCloudError as e:
        logger.error(
            "Failed to search grants in Firestore",
            error=str(e),
            search_params={
                "search_query": search_query,
                "category": category,
                "min_amount": min_amount,
                "max_amount": max_amount,
                "limit": limit,
                "offset": offset,
            },
        )
        return Response(
            content={"error": "Search service temporarily unavailable"},
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        )


@get("/public/grants/{grant_id:str}")
async def get_grant_details(grant_id: str) -> Response[GrantInfoResponse | dict[str, str]]:
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
    grant_info: GrantInfoResponse = {
        "id": doc.id,
        "title": data.get("title", ""),
        "release_date": data.get("release_date", ""),
        "expired_date": data.get("expired_date", ""),
        "activity_code": data.get("activity_code", ""),
        "organization": data.get("organization", ""),
        "parent_organization": data.get("parent_organization", ""),
        "participating_orgs": data.get("participating_orgs", ""),
        "document_number": data.get("document_number", ""),
        "document_type": data.get("document_type", ""),
        "clinical_trials": data.get("clinical_trials", ""),
        "url": data.get("url", ""),
        "description": data.get("description"),
        "amount": data.get("amount"),
        "amount_min": data.get("amount_min"),
        "amount_max": data.get("amount_max"),
        "category": data.get("category"),
        "eligibility": data.get("eligibility"),
        "deadline": data.get("deadline"),
    }

    logger.info("Public grant details retrieved", grant_id=grant_id)

    return Response(
        content=grant_info,
        status_code=HTTP_200_OK,
    )


@post("/public/grants/subscribe")
async def create_subscription(
    data: SubscriptionRequest,
) -> Response[SubscriptionResponse | dict[str, str]]:
    email = data["email"]
    search_params = data["search_params"]
    frequency = data.get("frequency", "daily")

    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_pattern, email) or len(email) > 254:
        logger.warning("Invalid email format", email=email)
        return Response(
            content={"error": "Invalid email format"},
            status_code=HTTP_400_BAD_REQUEST,
        )

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

    try:
        client = get_firestore_client()
        subscriptions_ref = client.collection("subscriptions")

        existing = subscriptions_ref.where("email", "==", email).limit(1).stream()
        existing_docs = [doc async for doc in existing]

        if existing_docs:
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

            try:
                import uuid  # noqa: PLC0415

                trace_id = str(uuid.uuid4())
                await publish_subscription_verification_email(
                    email=email,
                    subscription_id=subscription_id,
                    verification_token=verification_token,
                    search_params=dict(search_params),
                    frequency=frequency,
                    trace_id=trace_id,
                )
                logger.info(
                    "Sent verification email",
                    subscription_id=subscription_id,
                    email=email,
                    trace_id=trace_id,
                )
            except Exception as e:
                logger.error(
                    "Failed to send verification email",
                    subscription_id=subscription_id,
                    email=email,
                    error=str(e),
                )

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

    except GoogleCloudError as e:
        logger.error("Failed to create grant subscription", email=email, error=str(e))
        return Response(
            content={"error": "Subscription service temporarily unavailable"},
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        )


@get("/public/grants/verify/{token:str}")
async def verify_subscription(token: str) -> Response[dict[str, str]]:
    logger.info("Verifying subscription", token=token)

    client = get_firestore_client()
    subscriptions_ref = client.collection("subscriptions")

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
    logger.info("Unsubscribing from grant alerts", email=email)

    client = get_firestore_client()
    subscriptions_ref = client.collection("subscriptions")

    query = subscriptions_ref.where("email", "==", email).limit(1)
    docs = query.stream()

    subscription_docs = [doc async for doc in docs]

    if not subscription_docs:
        logger.warning("No subscription found", email=email)
        return Response(
            content={"message": "No subscription found for this email"},
            status_code=HTTP_200_OK,
        )

    for doc in subscription_docs:
        await doc.reference.delete()

    logger.info("Unsubscribed from grant alerts", email=email, count=len(subscription_docs))

    return Response(
        content={"message": "Successfully unsubscribed from grant alerts"},
        status_code=HTTP_200_OK,
    )
