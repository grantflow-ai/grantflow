import asyncio
import hashlib
import json
import re
from datetime import UTC, datetime, timedelta
from typing import NotRequired, TypedDict
from uuid import UUID

import functions_framework
from flask import Request
from google.cloud import pubsub_v1
from packages.db.src.connection import get_session_maker
from packages.db.src.tables import Grant, GrantMatchingSubscription
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

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
    verified: bool
    last_notification_sent: NotRequired[datetime]


class EmailNotificationMessage(TypedDict):
    email: str
    template_type: str
    template_data: dict[str, list[dict[str, str]] | str]


class MatcherResponse(TypedDict):
    message: str
    grants_processed: int
    subscriptions_processed: int
    notifications_sent: int


def _get_publisher_client() -> pubsub_v1.PublisherClient:
    return pubsub_v1.PublisherClient()


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
    if query and isinstance(query, str):
        query_lower = query.lower()
        searchable_text = grant.get("title", "").lower() + " " + grant.get("description", "").lower()
        return query_lower in searchable_text
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


def _create_notification_message(
    subscription: SubscriptionData, matching_grants: list[dict[str, str]], frequency: str
) -> EmailNotificationMessage:
    return {
        "email": subscription["email"],
        "template_type": "grant_alert",
        "template_data": {
            "grants": matching_grants,
            "frequency": frequency,
            "subscription_id": subscription["id"],
            "unsubscribe_url": f"https://grantflow.ai/grants/unsubscribe?id={subscription['id']}",
        },
    }


async def process_subscriptions_batch(
    subscriptions: list[SubscriptionData],
    new_grants: list[GrantData],
    publisher: pubsub_v1.PublisherClient,
    topic_path: str,
    session_maker: async_sessionmaker[AsyncSession],
) -> int:
    notifications_sent = 0

    for subscription in subscriptions:
        if not subscription.get("verified", False):
            continue

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

            message = _create_notification_message(subscription, matching_grants, frequency)

            message_data = json.dumps(message).encode("utf-8")
            future = publisher.publish(
                topic_path,
                message_data,
                deduplication_id=dedup_id,
            )

            try:
                future.result(timeout=30)
                notifications_sent += 1

                async with session_maker() as session, session.begin():
                    await session.execute(
                        update(GrantMatchingSubscription)
                        .where(GrantMatchingSubscription.id == UUID(subscription["id"]))
                        .values(last_notification_sent=datetime.now(UTC))
                    )

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

    return notifications_sent


async def _fetch_new_grants(session_maker: async_sessionmaker[AsyncSession], cutoff_time: datetime) -> list[GrantData]:
    async with session_maker() as session:
        result = await session.execute(select(Grant).where(Grant.created_at >= cutoff_time))
        grants = result.scalars().all()

        grants_data: list[GrantData] = []
        for grant in grants:
            grant_data = GrantData(
                id=str(grant.id),
                title=grant.title,
                description=grant.description,
                url=grant.url,
                deadline=grant.expired_date,
                amount=grant.amount,
                category=grant.category,
                eligibility=grant.eligibility,
            )
            grants_data.append(grant_data)

        return grants_data


async def _fetch_verified_subscriptions(session_maker: async_sessionmaker[AsyncSession]) -> list[SubscriptionData]:
    async with session_maker() as session:
        result = await session.execute(
            select(GrantMatchingSubscription).where(
                GrantMatchingSubscription.verified.is_(True), GrantMatchingSubscription.unsubscribed.is_(False)
            )
        )
        subscriptions = result.scalars().all()

        subscriptions_data: list[SubscriptionData] = []
        for sub in subscriptions:
            sub_data = SubscriptionData(
                id=str(sub.id),
                email=sub.email,
                search_params=sub.search_params,
                frequency=sub.frequency,
                verified=sub.verified,
            )
            if sub.last_notification_sent:
                sub_data["last_notification_sent"] = sub.last_notification_sent
            subscriptions_data.append(sub_data)

        return subscriptions_data


@functions_framework.http
def match_grants(request: Request) -> tuple[MatcherResponse, int]:  # noqa: ARG001
    return asyncio.run(_match_grants_async())


async def _match_grants_async() -> tuple[MatcherResponse, int]:
    logger.info("Starting grant matcher function")

    session_maker = get_session_maker()
    publisher = _get_publisher_client()

    project_id = get_env("GCP_PROJECT_ID", fallback="grantflow")
    topic_path = publisher.topic_path(project_id, "email-notifications")

    cutoff_time = datetime.now(UTC) - timedelta(days=1)
    new_grants = await _fetch_new_grants(session_maker, cutoff_time)

    logger.info("Found new grants", count=len(new_grants))

    if not new_grants:
        logger.info("No new grants to process")
        return MatcherResponse(
            message="No new grants", grants_processed=0, subscriptions_processed=0, notifications_sent=0
        ), 200

    all_subscriptions = await _fetch_verified_subscriptions(session_maker)

    batch_size = 100
    total_notifications = 0
    subscription_count = len(all_subscriptions)

    subscriptions = []
    for subscription in all_subscriptions:
        subscriptions.append(subscription)

        if len(subscriptions) >= batch_size:
            notifications = await process_subscriptions_batch(
                subscriptions, new_grants, publisher, topic_path, session_maker
            )
            total_notifications += notifications
            subscriptions = []

    if subscriptions:
        notifications = await process_subscriptions_batch(
            subscriptions, new_grants, publisher, topic_path, session_maker
        )
        total_notifications += notifications

    logger.info(
        "Grant matcher completed",
        grants_processed=len(new_grants),
        subscriptions_processed=subscription_count,
        notifications_sent=total_notifications,
    )

    return MatcherResponse(
        message="Grant matching completed",
        grants_processed=len(new_grants),
        subscriptions_processed=subscription_count,
        notifications_sent=total_notifications,
    ), 200
