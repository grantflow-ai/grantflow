"""Grant Matcher Cloud Function.

Matches new grants with user subscriptions and triggers email notifications.
Runs daily via Cloud Scheduler.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any, NotRequired, TypedDict

import functions_framework
from google.cloud import firestore, pubsub_v1
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger

if TYPE_CHECKING:
    from flask import Request

logger = get_logger(__name__)


class GrantData(TypedDict):
    """Grant data from Firestore."""

    title: str
    description: NotRequired[str]
    url: NotRequired[str]
    deadline: NotRequired[str]
    amount: NotRequired[str]
    category: NotRequired[str]
    eligibility: NotRequired[str]
    scraped_at: NotRequired[datetime]


class SubscriptionData(TypedDict):
    """Subscription data from Firestore."""

    email: str
    search_params: dict[str, Any]
    frequency: str
    verified: bool
    last_notification_sent: NotRequired[datetime]


class EmailNotificationMessage(TypedDict):
    """Message for email notification Pub/Sub."""

    email: str
    template_type: str
    template_data: dict[str, Any]


def get_firestore_client() -> firestore.Client:
    """Get Firestore client instance.

    Returns:
        firestore.Client: Firestore client
    """
    project_id = get_env("GCP_PROJECT_ID", fallback="grantflow")
    return firestore.Client(project=project_id)


def get_publisher_client() -> pubsub_v1.PublisherClient:
    """Get Pub/Sub publisher client.

    Returns:
        pubsub_v1.PublisherClient: Publisher client
    """
    return pubsub_v1.PublisherClient()


def match_grant_with_subscription(grant: GrantData, subscription: SubscriptionData) -> bool:
    """Check if a grant matches subscription criteria.

    Args:
        grant: Grant data from Firestore
        subscription: Subscription data from Firestore

    Returns:
        bool: True if grant matches subscription criteria
    """
    search_params = subscription.get("search_params", {})

    # Check category match
    if search_params.get("category"):
        grant_category = grant.get("category", "").lower()
        search_category = search_params["category"].lower()
        if grant_category != search_category:
            return False

    # Check amount range
    if search_params.get("min_amount") is not None:
        try:
            grant_amount_str = grant.get("amount", "")
            # Extract numeric value from strings like "$50,000 - $100,000"
            amounts = []
            for part in grant_amount_str.replace(",", "").split("-"):
                num_str = "".join(c for c in part if c.isdigit())
                if num_str:
                    amounts.append(int(num_str))

            if amounts and max(amounts) < search_params["min_amount"]:
                return False
        except (ValueError, AttributeError):
            pass

    if search_params.get("max_amount") is not None:
        try:
            grant_amount_str = grant.get("amount", "")
            amounts = []
            for part in grant_amount_str.replace(",", "").split("-"):
                num_str = "".join(c for c in part if c.isdigit())
                if num_str:
                    amounts.append(int(num_str))

            if amounts and min(amounts) > search_params["max_amount"]:
                return False
        except (ValueError, AttributeError):
            pass

    # Check deadline range
    if search_params.get("deadline_after"):
        grant_deadline = grant.get("deadline", "")
        if grant_deadline and grant_deadline < search_params["deadline_after"]:
            return False

    if search_params.get("deadline_before"):
        grant_deadline = grant.get("deadline", "")
        if grant_deadline and grant_deadline > search_params["deadline_before"]:
            return False

    # Check search query in title/description
    if search_params.get("query"):
        query_lower = search_params["query"].lower()
        title_match = query_lower in grant.get("title", "").lower()
        desc_match = query_lower in grant.get("description", "").lower()
        if not (title_match or desc_match):
            return False

    return True


def should_send_notification(subscription: SubscriptionData, frequency: str) -> bool:
    """Check if notification should be sent based on frequency.

    Args:
        subscription: Subscription data from Firestore
        frequency: Subscription frequency (daily/weekly)

    Returns:
        bool: True if notification should be sent
    """
    last_sent = subscription.get("last_notification_sent")
    if not last_sent:
        return True

    now = datetime.now(UTC)

    if frequency == "daily":
        return (now - last_sent).days >= 1
    if frequency == "weekly":
        return (now - last_sent).days >= 7

    return False


async def process_subscriptions_batch(
    subscriptions: list[firestore.DocumentSnapshot],
    new_grants: list[tuple[str, GrantData]],
    publisher: pubsub_v1.PublisherClient,
    topic_path: str,
    db: firestore.Client,  # noqa: ARG001
) -> int:
    """Process a batch of subscriptions.

    Args:
        subscriptions: Batch of subscription documents
        new_grants: List of (grant_id, grant_data) tuples
        publisher: Pub/Sub publisher client
        topic_path: Email notification topic path
        db: Firestore client

    Returns:
        int: Number of notifications sent
    """
    notifications_sent = 0

    for sub_doc in subscriptions:
        sub_data = sub_doc.to_dict()

        # Skip unverified subscriptions
        if not sub_data.get("verified", False):
            continue

        # Check frequency
        frequency = sub_data.get("frequency", "daily")
        if not should_send_notification(sub_data, frequency):
            continue

        # Find matching grants
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

        # Send notification if matches found
        if matching_grants:
            # Create deduplication ID to prevent duplicate emails
            dedup_content = f"{sub_data['email']}-{datetime.now(UTC).date()}-{len(matching_grants)}"
            dedup_id = hashlib.sha256(dedup_content.encode()).hexdigest()[:16]

            message: EmailNotificationMessage = {
                "email": sub_data["email"],
                "template_type": "grant_alert",
                "template_data": {
                    "grants": matching_grants,
                    "frequency": frequency,
                    "subscription_id": sub_doc.id,
                    "unsubscribe_url": f"https://grantflow.ai/grants/unsubscribe?id={sub_doc.id}",
                },
            }

            # Publish to email notification topic
            message_data = json.dumps(message).encode("utf-8")
            future = publisher.publish(
                topic_path,
                message_data,
                deduplication_id=dedup_id,
            )

            try:
                future.result(timeout=30)
                notifications_sent += 1

                # Update last notification sent
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


@functions_framework.http
def match_grants(request: Request) -> tuple[dict[str, Any], int]:
    """Match grants with subscriptions and send notifications.

    This function is triggered daily by Cloud Scheduler.

    Args:
        request: HTTP request from Cloud Scheduler

    Returns:
        Response with processing statistics
    """
    logger.info("Starting grant matcher function")

    # Verify request is from Cloud Scheduler
    if request.headers.get("X-CloudScheduler") != "true":
        logger.warning("Request not from Cloud Scheduler")
        return {"error": "Unauthorized"}, 401

    db = get_firestore_client()
    publisher = get_publisher_client()

    project_id = get_env("GCP_PROJECT_ID", fallback="grantflow")
    topic_path = publisher.topic_path(project_id, "email-notifications")

    # Get grants from last 24 hours
    cutoff_time = datetime.now(UTC) - timedelta(days=1)

    grants_ref = db.collection("grants")
    new_grants_query = grants_ref.where("scraped_at", ">=", cutoff_time)

    new_grants: list[tuple[str, GrantData]] = []
    for grant_doc in new_grants_query.stream():
        grant_data = grant_doc.to_dict()
        new_grants.append((grant_doc.id, grant_data))

    logger.info("Found new grants", count=len(new_grants))

    if not new_grants:
        logger.info("No new grants to process")
        return {"message": "No new grants", "notifications_sent": 0}, 200

    # Get all verified subscriptions
    subscriptions_ref = db.collection("subscriptions")
    subscriptions_query = subscriptions_ref.where("verified", "==", True)

    # Process subscriptions in batches to avoid memory issues
    batch_size = 100
    total_notifications = 0
    subscription_count = 0

    subscriptions = []
    for sub_doc in subscriptions_query.stream():
        subscriptions.append(sub_doc)
        subscription_count += 1

        if len(subscriptions) >= batch_size:
            # Process batch
            notifications = asyncio.run(
                process_subscriptions_batch(subscriptions, new_grants, publisher, topic_path, db)
            )
            total_notifications += notifications
            subscriptions = []

    # Process remaining subscriptions
    if subscriptions:
        notifications = asyncio.run(process_subscriptions_batch(subscriptions, new_grants, publisher, topic_path, db))
        total_notifications += notifications

    logger.info(
        "Grant matcher completed",
        grants_processed=len(new_grants),
        subscriptions_processed=subscription_count,
        notifications_sent=total_notifications,
    )

    return {
        "message": "Grant matching completed",
        "grants_processed": len(new_grants),
        "subscriptions_processed": subscription_count,
        "notifications_sent": total_notifications,
    }, 200
