import asyncio
import hashlib
import json
import re
from datetime import UTC, datetime, timedelta
from typing import NotRequired, TypedDict

import functions_framework
from flask import Request
from google.cloud import firestore, pubsub_v1
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


class GrantData(TypedDict):
    title: str
    description: NotRequired[str]
    url: NotRequired[str]
    deadline: NotRequired[str]
    amount: NotRequired[str]
    category: NotRequired[str]
    eligibility: NotRequired[str]
    scraped_at: NotRequired[datetime]


class SubscriptionData(TypedDict):
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


def _get_firestore_client() -> firestore.Client:
    project_id = get_env("GCP_PROJECT_ID", fallback="grantflow")
    return firestore.Client(project=project_id)


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
        grant_category = grant.get("category", "").lower()
        return grant_category == category_filter.lower()
    return True


def _match_amount(grant: GrantData, min_filter: str | float | None, max_filter: str | float | None) -> bool:
    if min_filter is None and max_filter is None:
        return True

    grant_min, grant_max = _parse_grant_amounts(grant.get("amount", ""))

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
    sub_data: dict[str, str], sub_doc: firestore.DocumentSnapshot, matching_grants: list[dict[str, str]], frequency: str
) -> EmailNotificationMessage:
    return {
        "email": sub_data["email"],
        "template_type": "grant_alert",
        "template_data": {
            "grants": matching_grants,
            "frequency": frequency,
            "subscription_id": sub_doc.id,
            "unsubscribe_url": f"https://grantflow.ai/grants/unsubscribe?id={sub_doc.id}",
        },
    }


async def process_subscriptions_batch(
    subscriptions: list[firestore.DocumentSnapshot],
    new_grants: list[tuple[str, GrantData]],
    publisher: pubsub_v1.PublisherClient,
    topic_path: str,
    db: firestore.Client,  # noqa: ARG001
) -> int:
    notifications_sent = 0

    for sub_doc in subscriptions:
        sub_data = sub_doc.to_dict()
        if not sub_data:
            continue

        if not sub_data.get("verified", False):
            continue

        frequency = sub_data.get("frequency", "daily")
        if not should_send_notification(sub_data, frequency):
            continue

        matching_grants = []
        for grant_id, grant_data in new_grants:
            if match_grant_with_subscription(grant_data, sub_data):
                matching_grants.append(
                    {
                        "id": grant_id,
                        "title": grant_data.get("title", ""),
                        "url": grant_data.get("url", ""),
                        "deadline": grant_data.get("deadline", ""),
                        "amount": grant_data.get("amount", ""),
                    }
                )

        if matching_grants:
            dedup_content = f"{sub_data['email']}-{datetime.now(UTC).date()}-{len(matching_grants)}"
            dedup_id = hashlib.sha256(dedup_content.encode()).hexdigest()[:16]

            message = _create_notification_message(sub_data, sub_doc, matching_grants, frequency)

            message_data = json.dumps(message).encode("utf-8")
            future = publisher.publish(
                topic_path,
                message_data,
                deduplication_id=dedup_id,
            )

            try:
                future.result(timeout=30)
                notifications_sent += 1

                sub_doc.reference.update(
                    {
                        "last_notification_sent": firestore.SERVER_TIMESTAMP,
                    }
                )

                logger.info(
                    "Sent grant alert notification",
                    email=sub_data["email"],
                    grant_count=len(matching_grants),
                    dedup_id=dedup_id,
                )
            except Exception as e:
                logger.error(
                    "Failed to send notification",
                    email=sub_data["email"],
                    error=str(e),
                )

    return notifications_sent


def _fetch_new_grants(db: firestore.Client, cutoff_time: datetime) -> list[tuple[str, GrantData]]:
    grants_ref = db.collection("grants")
    new_grants_query = grants_ref.where("scraped_at", ">=", cutoff_time)

    new_grants: list[tuple[str, GrantData]] = []
    for grant_doc in new_grants_query.stream():
        grant_data = grant_doc.to_dict()
        if grant_data:
            new_grants.append((grant_doc.id, grant_data))

    return new_grants


def _fetch_verified_subscriptions(db: firestore.Client) -> list[firestore.DocumentSnapshot]:
    subscriptions_ref = db.collection("subscriptions")
    subscriptions_query = subscriptions_ref.where("verified", "==", True)
    return list(subscriptions_query.stream())


@functions_framework.http
def match_grants(request: Request) -> tuple[MatcherResponse, int]:  # noqa: ARG001
    logger.info("Starting grant matcher function")

    db = _get_firestore_client()
    publisher = _get_publisher_client()

    project_id = get_env("GCP_PROJECT_ID", fallback="grantflow")
    topic_path = publisher.topic_path(project_id, "email-notifications")

    cutoff_time = datetime.now(UTC) - timedelta(days=1)
    new_grants = _fetch_new_grants(db, cutoff_time)

    logger.info("Found new grants", count=len(new_grants))

    if not new_grants:
        logger.info("No new grants to process")
        return MatcherResponse(
            message="No new grants", grants_processed=0, subscriptions_processed=0, notifications_sent=0
        ), 200

    all_subscriptions = _fetch_verified_subscriptions(db)

    batch_size = 100
    total_notifications = 0
    subscription_count = len(all_subscriptions)

    subscriptions = []
    for sub_doc in all_subscriptions:
        subscriptions.append(sub_doc)

        if len(subscriptions) >= batch_size:
            notifications = asyncio.run(
                process_subscriptions_batch(subscriptions, new_grants, publisher, topic_path, db)
            )
            total_notifications += notifications
            subscriptions = []

    if subscriptions:
        notifications = asyncio.run(process_subscriptions_batch(subscriptions, new_grants, publisher, topic_path, db))
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
