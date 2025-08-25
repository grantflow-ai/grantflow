import secrets
from datetime import UTC, datetime
from typing import Any, NotRequired, TypedDict

from litestar import Response, get, post
from litestar.status_codes import (
    HTTP_200_OK,
    HTTP_201_CREATED,
    HTTP_400_BAD_REQUEST,
    HTTP_404_NOT_FOUND,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from packages.db.src.tables import Grant, GrantMatchingSubscription
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import publish_subscription_verification_email
from sqlalchemy import func, insert, or_, select, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import async_sessionmaker

logger = get_logger(__name__)


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
    deadline: NotRequired[str | None]


class SubscriptionRequest(TypedDict):
    email: str
    search_params: NotRequired[dict[str, Any]]
    frequency: NotRequired[str]


class SubscriptionResponse(TypedDict):
    id: str
    message: str


class UnsubscribeRequest(TypedDict):
    email: str


@get("/grants")
async def search_grants(
    session_maker: async_sessionmaker[Any],
    search_query: str | None = None,
    category: str | None = None,
    min_amount: int | None = None,
    max_amount: int | None = None,
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
        async with session_maker() as session:
            query = select(Grant)

            if search_query:
                search_vector = func.to_tsvector("english", Grant.description)
                search_tsquery = func.plainto_tsquery("english", search_query)
                text_filter = or_(
                    func.lower(Grant.title).contains(search_query.lower()),
                    func.lower(Grant.organization).contains(search_query.lower()),
                    func.lower(Grant.parent_organization).contains(search_query.lower()),
                    func.lower(Grant.document_number).contains(search_query.lower()),
                    search_vector.op("@@")(search_tsquery),
                )
                query = query.where(text_filter)

            if category:
                query = query.where(Grant.category == category)

            if min_amount is not None:
                query = query.where(Grant.amount_min >= min_amount)

            if max_amount is not None:
                query = query.where(Grant.amount_max <= max_amount)

            query = query.order_by(Grant.created_at.desc()).offset(offset).limit(limit)

            result = await session.execute(query)
            grants = result.scalars().all()

            results: list[GrantInfoResponse] = []
            for grant in grants:
                grant_info: GrantInfoResponse = {
                    "id": str(grant.id),
                    "title": grant.title,
                    "release_date": grant.release_date,
                    "expired_date": grant.expired_date,
                    "activity_code": grant.activity_code,
                    "organization": grant.organization,
                    "parent_organization": grant.parent_organization,
                    "participating_orgs": grant.participating_orgs,
                    "document_number": grant.document_number,
                    "document_type": grant.document_type,
                    "clinical_trials": grant.clinical_trials,
                    "url": grant.url,
                    "description": grant.description,
                    "amount": grant.amount,
                    "amount_min": grant.amount_min,
                    "amount_max": grant.amount_max,
                    "category": grant.category,
                    "eligibility": grant.eligibility,
                    "deadline": None,
                }

                results.append(grant_info)

            logger.info("Public grant search completed", result_count=len(results))

            return Response(
                content=results,
                status_code=HTTP_200_OK,
            )

    except SQLAlchemyError as e:
        logger.error(
            "Failed to search grants in database",
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


@get("/grants/{grant_id:str}")
async def get_grant_details(
    grant_id: str, session_maker: async_sessionmaker[Any]
) -> Response[GrantInfoResponse | dict[str, str]]:
    logger.info("Public grant details request", grant_id=grant_id)

    try:
        async with session_maker() as session:
            query = select(Grant).where(Grant.document_number == grant_id)
            result = await session.execute(query)
            grant = result.scalar_one_or_none()

            if not grant:
                logger.warning("Grant not found", document_number=grant_id)
                return Response(
                    content={"error": "Grant not found"},
                    status_code=HTTP_404_NOT_FOUND,
                )

            grant_info: GrantInfoResponse = {
                "id": str(grant.id),
                "title": grant.title,
                "release_date": grant.release_date,
                "expired_date": grant.expired_date,
                "activity_code": grant.activity_code,
                "organization": grant.organization,
                "parent_organization": grant.parent_organization,
                "participating_orgs": grant.participating_orgs,
                "document_number": grant.document_number,
                "document_type": grant.document_type,
                "clinical_trials": grant.clinical_trials,
                "url": grant.url,
                "description": grant.description,
                "amount": grant.amount,
                "amount_min": grant.amount_min,
                "amount_max": grant.amount_max,
                "category": grant.category,
                "eligibility": grant.eligibility,
                "deadline": None,
            }

            logger.info("Public grant details retrieved", document_number=grant_id)

            return Response(
                content=grant_info,
                status_code=HTTP_200_OK,
            )

    except SQLAlchemyError as e:
        logger.error("Failed to retrieve grant details", document_number=grant_id, error=str(e))
        return Response(
            content={"error": "Grant service temporarily unavailable"},
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        )


@post("/grants/subscribe")
async def create_subscription(
    data: SubscriptionRequest,
    session_maker: async_sessionmaker[Any],
) -> Response[SubscriptionResponse | dict[str, str]]:
    logger.info("Creating grant subscription", email=data["email"])

    try:
        async with session_maker() as session, session.begin():
            verification_token = secrets.token_urlsafe(32)

            subscription_data = {
                "email": data["email"],
                "search_params": data.get("search_params", {}),
                "frequency": data.get("frequency", "daily"),
                "verified": False,
                "verification_token": verification_token,
                "unsubscribed": False,
            }

            try:
                result = await session.execute(
                    insert(GrantMatchingSubscription)
                    .values(**subscription_data)
                    .returning(GrantMatchingSubscription.id)
                )
                subscription_id = result.scalar_one()

                await publish_subscription_verification_email(
                    email=data["email"],
                    subscription_id=str(subscription_id),
                    verification_token=verification_token,
                    search_params=data.get("search_params"),
                    frequency=data.get("frequency", "daily"),
                )

                logger.info(
                    "Grant subscription created",
                    subscription_id=str(subscription_id),
                    email=data["email"],
                )

                return Response(
                    content=SubscriptionResponse(
                        id=str(subscription_id),
                        message="Subscription created successfully. Please check your email to verify.",
                    ),
                    status_code=HTTP_201_CREATED,
                )

            except IntegrityError as e:
                logger.warning(
                    "Duplicate subscription attempt",
                    email=data["email"],
                    error=str(e),
                )
                return Response(
                    content={"error": "A subscription with this email already exists"},
                    status_code=HTTP_400_BAD_REQUEST,
                )

    except SQLAlchemyError as e:
        logger.error(
            "Failed to create grant subscription",
            email=data["email"],
            error=str(e),
        )
        return Response(
            content={"error": "Subscription service temporarily unavailable"},
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        )


@get("/grants/verify/{token:str}")
async def verify_subscription(token: str, session_maker: async_sessionmaker[Any]) -> Response[dict[str, str]]:
    logger.info("Verifying grant subscription", token=token[:8] + "...")

    try:
        async with session_maker() as session, session.begin():
            subscription = await session.scalar(
                select(GrantMatchingSubscription)
                .where(GrantMatchingSubscription.verification_token == token)
                .where(GrantMatchingSubscription.verified.is_(False))
                .where(GrantMatchingSubscription.unsubscribed.is_(False))
            )

            if not subscription:
                logger.warning("Invalid or expired verification token", token=token[:8] + "...")
                return Response(
                    content={"error": "Invalid or expired verification token"},
                    status_code=HTTP_404_NOT_FOUND,
                )

            await session.execute(
                update(GrantMatchingSubscription)
                .where(GrantMatchingSubscription.id == subscription.id)
                .values(verified=True, verification_token=None)
            )

            logger.info(
                "Grant subscription verified",
                subscription_id=str(subscription.id),
                email=subscription.email,
            )

            return Response(
                content={"message": "Subscription verified successfully"},
                status_code=HTTP_200_OK,
            )

    except SQLAlchemyError as e:
        logger.error(
            "Failed to verify grant subscription",
            token=token[:8] + "...",
            error=str(e),
        )
        return Response(
            content={"error": "Verification service temporarily unavailable"},
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        )


@post("/grants/unsubscribe")
async def unsubscribe(data: UnsubscribeRequest, session_maker: async_sessionmaker[Any]) -> Response[dict[str, str]]:
    logger.info("Unsubscribing from grant notifications", email=data["email"])

    try:
        async with session_maker() as session, session.begin():
            subscription = await session.scalar(
                select(GrantMatchingSubscription)
                .where(GrantMatchingSubscription.email == data["email"])
                .where(GrantMatchingSubscription.unsubscribed.is_(False))
            )

            if not subscription:
                logger.warning("No active subscription found", email=data["email"])
                return Response(
                    content={"error": "No active subscription found for this email"},
                    status_code=HTTP_404_NOT_FOUND,
                )

            await session.execute(
                update(GrantMatchingSubscription)
                .where(GrantMatchingSubscription.id == subscription.id)
                .values(unsubscribed=True, unsubscribed_at=datetime.now(UTC))
            )

            logger.info(
                "Grant subscription cancelled",
                subscription_id=str(subscription.id),
                email=data["email"],
            )

            return Response(
                content={"message": "Successfully unsubscribed from grant notifications"},
                status_code=HTTP_200_OK,
            )

    except SQLAlchemyError as e:
        logger.error(
            "Failed to unsubscribe from grant notifications",
            email=data["email"],
            error=str(e),
        )
        return Response(
            content={"error": "Unsubscribe service temporarily unavailable"},
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
        )
