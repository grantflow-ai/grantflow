from datetime import UTC, datetime
from typing import Any, NotRequired, TypedDict

from litestar import get, post
from litestar.exceptions import NotFoundException, ValidationException
from packages.db.src.tables import Grant, GrantMatchingSubscription
from packages.shared_utils.src.exceptions import DatabaseError
from packages.shared_utils.src.logger import get_logger
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


class UnsubscribeResponse(TypedDict):
    message: str


@get("/grants")
async def handle_search_grants(
    session_maker: async_sessionmaker[Any],
    search_query: str | None = None,
    category: str | None = None,
    min_amount: int | None = None,
    max_amount: int | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[GrantInfoResponse]:
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
            return results

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
        raise DatabaseError("Search service temporarily unavailable") from e


@get("/grants/{grant_id:str}", operation_id="GetGrantDetails")
async def handle_get_grant_details(grant_id: str, session_maker: async_sessionmaker[Any]) -> GrantInfoResponse:
    logger.info("Public grant details request", grant_id=grant_id)

    try:
        async with session_maker() as session:
            query = select(Grant).where(Grant.document_number == grant_id)
            result = await session.execute(query)
            grant = result.scalar_one_or_none()

            if not grant:
                logger.warning("Grant not found", document_number=grant_id)
                raise NotFoundException("Grant not found")

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
            return grant_info

    except SQLAlchemyError as e:
        logger.error("Failed to retrieve grant details", document_number=grant_id, error=str(e))
        raise DatabaseError("Grant service temporarily unavailable") from e


@post("/grants/subscribe", operation_id="CreateSubscription")
async def handle_create_subscription(
    data: SubscriptionRequest,
    session_maker: async_sessionmaker[Any],
) -> SubscriptionResponse:
    logger.info("Creating grant subscription", email=data["email"])

    try:
        async with session_maker() as session, session.begin():
            subscription_data = {
                "email": data["email"],
                "search_params": data.get("search_params", {}),
                "frequency": data.get("frequency", "daily"),
                "unsubscribed": False,
            }

            try:
                result = await session.execute(
                    insert(GrantMatchingSubscription)
                    .values(**subscription_data)
                    .returning(GrantMatchingSubscription.id)
                )
                subscription_id = result.scalar_one()

                logger.info(
                    "Grant subscription created",
                    subscription_id=str(subscription_id),
                    email=data["email"],
                )

                return SubscriptionResponse(
                    id=str(subscription_id),
                    message="Subscription created successfully.",
                )

            except IntegrityError as e:
                logger.warning(
                    "Duplicate subscription attempt",
                    email=data["email"],
                    error=str(e),
                )
                raise ValidationException("A subscription with this email already exists") from e

    except SQLAlchemyError as e:
        logger.error(
            "Failed to create grant subscription",
            email=data["email"],
            error=str(e),
        )
        raise DatabaseError("Subscription service temporarily unavailable") from e


@post("/grants/unsubscribe", operation_id="Unsubscribe")
async def handle_unsubscribe(
    data: UnsubscribeRequest,
    session_maker: async_sessionmaker[Any],
) -> UnsubscribeResponse:
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
                raise NotFoundException("No active subscription found for this email")

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

            return UnsubscribeResponse(
                message="Successfully unsubscribed from grant notifications",
            )

    except SQLAlchemyError as e:
        logger.error(
            "Failed to unsubscribe from grant notifications",
            email=data["email"],
            error=str(e),
        )
        raise DatabaseError("Unsubscribe service temporarily unavailable") from e
