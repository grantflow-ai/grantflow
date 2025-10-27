import hashlib
import re
from datetime import UTC, datetime
from typing import Any, Literal, NotRequired, TypedDict
from uuid import UUID

from litestar import post
from packages.db.src.tables import Grant, GrantMatchingSubscription
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from services.backend.src.utils.email import send_grant_alert_email

logger = get_logger(__name__)


class GrantData(TypedDict):
    id: str
    title: str
    description: NotRequired[str]
    url: NotRequired[str]
    deadline: NotRequired[str]
    amount: NotRequired[str | None]
    category: NotRequired[str | None]
    eligibility: NotRequired[str | None]


class SubscriptionData(TypedDict):
    id: str
    email: str
    search_params: dict[str, str | int | float | None]
    frequency: str
    last_notification_sent: NotRequired[datetime]


class MatcherResponse(TypedDict):
    status: Literal["success"]
    message: str
    grants_processed: int
    subscriptions_processed: int
    notifications_sent: int


def _parse_grant_amounts(amount_str: str) -> tuple[int | None, int | None]:
    if not amount_str:
        return None, None

    clean_str = amount_str.replace(",", "").replace("$", "")

    multiplier = 1
    if "M" in clean_str.upper():
        multiplier = 1_000_000
        clean_str = clean_str.upper().replace("M", "")
    elif "K" in clean_str.upper():
        multiplier = 1_000
        clean_str = clean_str.upper().replace("K", "")

    numbers = re.findall(r"\d+(?:\.\d+)?", clean_str)

    if not numbers:
        return None, None

    amounts = [int(float(n) * multiplier) for n in numbers]

    if len(amounts) == 1:
        return amounts[0], amounts[0]
    return min(amounts), max(amounts)


def _match_category(grant: GrantData, category_filter: str | float | None) -> bool:
    if category_filter and isinstance(category_filter, str):
        grant_category = grant.get("category")
        if grant_category:
            return grant_category.lower() == category_filter.lower()
        return False
    return True


def _match_amount(grant: GrantData, min_filter: str | float | None, max_filter: str | float | None) -> bool:
    if min_filter is None and max_filter is None:
        return True

    amount_str = grant.get("amount")
    if not amount_str:
        return True

    grant_min, grant_max = _parse_grant_amounts(amount_str)

    if isinstance(min_filter, (int, float)) and grant_max is not None and grant_max < min_filter:
        return False

    return not (isinstance(max_filter, (int, float)) and grant_min is not None and grant_min > max_filter)


def _match_deadline(grant: GrantData, deadline_after: str | float | None, deadline_before: str | float | None) -> bool:
    grant_deadline = grant.get("deadline", "")

    if deadline_after and grant_deadline and isinstance(deadline_after, str) and grant_deadline < deadline_after:
        return False

    return not (
        deadline_before and grant_deadline and isinstance(deadline_before, str) and grant_deadline > deadline_before
    )


def _match_query(grant: GrantData, query: str | float | None) -> bool:
    """Match query against grant title, description, and eligibility using simple contains.

    For better performance, this uses simple string matching. The database GIN index
    is available for more sophisticated full-text search if needed in the future.
    """
    if query and isinstance(query, str):
        query_lower = query.lower()
        # Search in title, description, and eligibility
        searchable_text = (
            grant.get("title", "").lower()
            + " "
            + grant.get("description", "").lower()
            + " "
            + (grant.get("eligibility") or "").lower()
        )
        # Support multi-word queries by checking if all words are present
        query_words = query_lower.split()
        return all(word in searchable_text for word in query_words)
    return True


def match_grant_with_subscription(grant: GrantData, subscription: SubscriptionData) -> bool:
    search_params = subscription.get("search_params", {})

    if not search_params:
        return True

    if not _match_category(grant, search_params.get("category")):
        return False

    if not _match_amount(grant, search_params.get("min_amount"), search_params.get("max_amount")):
        return False

    if not _match_deadline(grant, search_params.get("deadline_after"), search_params.get("deadline_before")):
        return False

    return _match_query(grant, search_params.get("query"))


def should_send_notification(subscription: SubscriptionData, frequency: str) -> bool:
    last_sent = subscription.get("last_notification_sent")
    if not last_sent:
        return True

    now = datetime.now(UTC)

    if frequency == "daily":
        return (now - last_sent).days >= 1
    if frequency == "weekly":
        return (now - last_sent).days >= 7

    return False


async def _fetch_active_grants(session_maker: async_sessionmaker[AsyncSession]) -> list[GrantData]:
    """Fetch all non-expired grants from the database.

    Returns grants that haven't expired yet (expired_date >= today).
    This allows matching against the full catalog of active grants,
    not just recently added ones.
    """
    async with session_maker() as session:
        today = datetime.now(UTC).date().isoformat()

        # Fetch non-expired grants (where expired_date >= today)
        # Note: expired_date is stored as string in YYYY-MM-DD format
        result = await session.execute(
            select(Grant)
            .where(Grant.deleted_at.is_(None))
            .where(Grant.expired_date >= today)
            .order_by(Grant.expired_date.desc())
        )
        grants = result.scalars().all()

        grants_data: list[GrantData] = []
        for grant in grants:
            grant_data = GrantData(
                id=str(grant.id),
                title=grant.title,
                description=grant.description or "",
                url=grant.url,
                deadline=grant.expired_date,
                amount=grant.amount,
                category=grant.category,
                eligibility=grant.eligibility,
            )
            grants_data.append(grant_data)

        return grants_data


async def _fetch_active_subscriptions(session_maker: async_sessionmaker[AsyncSession]) -> list[SubscriptionData]:
    async with session_maker() as session:
        result = await session.execute(
            select(GrantMatchingSubscription).where(GrantMatchingSubscription.unsubscribed.is_(False))
        )
        subscriptions = result.scalars().all()

        subscriptions_data: list[SubscriptionData] = []
        for sub in subscriptions:
            sub_data = SubscriptionData(
                id=str(sub.id),
                email=sub.email,
                search_params=sub.search_params,
                frequency=sub.frequency,
            )
            if sub.last_notification_sent:
                sub_data["last_notification_sent"] = sub.last_notification_sent
            subscriptions_data.append(sub_data)

        return subscriptions_data


async def process_subscriptions_batch(
    subscriptions: list[SubscriptionData],
    new_grants: list[GrantData],
    session_maker: async_sessionmaker[AsyncSession],
) -> int:
    notifications_sent = 0
    subscription_updates: list[UUID] = []

    for subscription in subscriptions:
        frequency = subscription.get("frequency", "daily")
        if not should_send_notification(subscription, frequency):
            continue

        matching_grants = [
            {
                "id": grant_data["id"],
                "title": grant_data.get("title", ""),
                "url": grant_data.get("url", ""),
                "deadline": grant_data.get("deadline", ""),
                "amount": grant_data.get("amount") or "",
            }
            for grant_data in new_grants
            if match_grant_with_subscription(grant_data, subscription)
        ]

        if matching_grants:
            dedup_content = f"{subscription['email']}-{datetime.now(UTC).date()}-{len(matching_grants)}"
            dedup_id = hashlib.sha256(dedup_content.encode()).hexdigest()[:16]

            site_url = get_env("SITE_URL", fallback="https://grantflow.ai")
            unsubscribe_url = f"{site_url}/grants/unsubscribe?id={subscription['id']}"

            try:
                await send_grant_alert_email(
                    email=subscription["email"],
                    grants=matching_grants,
                    frequency=frequency,
                    unsubscribe_url=unsubscribe_url,
                )
                notifications_sent += 1
                subscription_updates.append(UUID(subscription["id"]))

                logger.info(
                    "Sent grant alert notification",
                    email=subscription["email"],
                    grant_count=len(matching_grants),
                    dedup_id=dedup_id,
                )
            except Exception as e:
                logger.error(
                    "Failed to send notification",
                    email=subscription["email"],
                    error=str(e),
                )

    if subscription_updates:
        async with session_maker() as session, session.begin():
            await session.execute(
                update(GrantMatchingSubscription)
                .where(GrantMatchingSubscription.id.in_(subscription_updates))
                .values(last_notification_sent=datetime.now(UTC))
            )
            logger.info("Batch updated subscription timestamps", count=len(subscription_updates))

    return notifications_sent


@post(
    "/webhooks/scheduler/grant-matcher",
    operation_id="GrantMatcherWebhook",
    tags=["Webhooks"],
)
async def handle_grant_matcher_webhook(session_maker: async_sessionmaker[Any]) -> MatcherResponse:
    """Match active grants against user subscriptions and send notifications.

    Changed from processing only grants from last 24h to processing ALL non-expired grants.
    This ensures users get notified about relevant grants even if they subscribed after
    the grants were added to the database.
    """
    logger.info("Starting grant matcher webhook")

    # Fetch ALL active (non-expired) grants, not just recent ones
    active_grants = await _fetch_active_grants(session_maker)

    logger.info("Found active grants", count=len(active_grants))

    if not active_grants:
        logger.info("No active grants to process")
        return MatcherResponse(
            status="success",
            message="No active grants to process",
            grants_processed=0,
            subscriptions_processed=0,
            notifications_sent=0,
        )

    all_subscriptions = await _fetch_active_subscriptions(session_maker)

    if not all_subscriptions:
        logger.info("No active subscriptions found")
        return MatcherResponse(
            status="success",
            message="No active subscriptions",
            grants_processed=len(active_grants),
            subscriptions_processed=0,
            notifications_sent=0,
        )

    batch_size = 100
    total_notifications = 0
    subscription_count = len(all_subscriptions)

    # Process subscriptions in batches
    subscriptions = []
    for subscription in all_subscriptions:
        subscriptions.append(subscription)

        if len(subscriptions) >= batch_size:
            notifications = await process_subscriptions_batch(subscriptions, active_grants, session_maker)
            total_notifications += notifications
            subscriptions = []

    if subscriptions:
        notifications = await process_subscriptions_batch(subscriptions, active_grants, session_maker)
        total_notifications += notifications

    logger.info(
        "Grant matcher completed",
        grants_processed=len(active_grants),
        subscriptions_processed=subscription_count,
        notifications_sent=total_notifications,
    )

    return MatcherResponse(
        status="success",
        message="Grant matching completed",
        grants_processed=len(active_grants),
        subscriptions_processed=subscription_count,
        notifications_sent=total_notifications,
    )
