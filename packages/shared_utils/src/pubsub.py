from contextlib import suppress
from typing import TYPE_CHECKING, Any, Literal, NotRequired, TypedDict
from uuid import UUID

import google.cloud.pubsub_v1 as pubsub
import msgspec
from google.api_core.exceptions import AlreadyExists
from google.cloud.pubsub_v1.publisher.exceptions import MessageTooLargeError

from packages.db.src.enums import SourceIndexingStatusEnum
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import BackendError, DeserializationError
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.serialization import deserialize, serialize
from packages.shared_utils.src.sync import run_sync

if TYPE_CHECKING:
    from structlog.typing import FilteringBoundLogger

client_ref = Ref[pubsub.PublisherClient]()
subscriber_client_ref = Ref[pubsub.SubscriberClient]()


class PubSubMessage(msgspec.Struct, rename="camel"):
    publish_time: str | None = None
    message_id: str | None = None
    data: str | None = None
    attributes: dict[str, str] | None = None
    ordering_key: str | None = None


class PubSubEvent(msgspec.Struct, rename="camel"):
    message: PubSubMessage
    subscription: str | None = None


class CrawlingRequest(TypedDict):
    source_id: UUID
    workspace_id: UUID
    parent_id: UUID
    url: str


class SourceProcessingResult(TypedDict):
    source_id: UUID
    indexing_status: SourceIndexingStatusEnum
    identifier: str


class RagProcessingStatus(TypedDict):
    event: str
    message: str
    data: NotRequired[dict[str, Any]]


class RagRequest(TypedDict):
    parent_type: Literal["grant_application", "grant_template"]
    parent_id: UUID


class WebsocketMessage[T](TypedDict):
    type: Literal["info", "error", "data"]
    parent_id: UUID
    event: str
    data: T


def get_publisher_client() -> pubsub.PublisherClient:
    if not client_ref.value:
        client = pubsub.PublisherClient()
        client_ref.value = client

    return client_ref.value


def get_subscriber_client() -> pubsub.SubscriberClient:
    if not subscriber_client_ref.value:
        client = pubsub.SubscriberClient()
        subscriber_client_ref.value = client

    return subscriber_client_ref.value


async def publish_url_crawling_task(
    *,
    logger: "FilteringBoundLogger",
    url: str,
    source_id: str | UUID,
    workspace_id: str | UUID,
    parent_id: str | UUID,
) -> str:
    client = get_publisher_client()

    data = CrawlingRequest(
        url=url,
        source_id=UUID(str(source_id)),
        workspace_id=UUID(str(workspace_id)),
        parent_id=UUID(str(parent_id)),
    )

    try:
        message_data = serialize(data)
        topic_path = client.topic_path(
            project=get_env("GCP_PROJECT_ID", fallback="grantflow"),
            topic=get_env("URL_CRAWLING_PUBSUB_TOPIC", fallback="url-crawling"),
        )
        future = client.publish(topic=topic_path, data=message_data)
        message_id = await run_sync(future.result)
        logger.info(
            "Published message to crawl URL",
            message_id=message_id,
            url=url,
            source_id=str(source_id),
        )
        return str(message_id)
    except MessageTooLargeError as e:
        logger.error("Error publishing URL crawling message", error=str(e))
        raise BackendError(
            "Error publishing URL crawling message", context={"error": str(e)}
        ) from e


async def publish_rag_task(
    *,
    logger: "FilteringBoundLogger",
    parent_type: Literal["grant_application", "grant_template"],
    parent_id: str | UUID,
) -> str:
    client = get_publisher_client()

    data = RagRequest(
        parent_type=parent_type,
        parent_id=UUID(str(parent_id)),
    )

    try:
        message_data = serialize(data)
        topic_path = client.topic_path(
            project=get_env("GCP_PROJECT_ID", fallback="grantflow"),
            topic=get_env("RAG_PROCESSING_PUBSUB_TOPIC", fallback="rag-processing"),
        )
        future = client.publish(topic=topic_path, data=message_data)
        message_id = await run_sync(future.result)
        logger.info(
            "Published message to process RAG",
            message_id=message_id,
            parent_type=parent_type,
            parent_id=str(parent_id),
        )
        return str(message_id)
    except MessageTooLargeError as e:
        logger.error("Error publishing RAG processing message", error=str(e))
        raise BackendError(
            "Error publishing RAG processing message", context={"error": str(e)}
        ) from e


async def ensure_subscription_for_parent_id(parent_id: UUID) -> str:
    subscriber = get_subscriber_client()
    project_id = get_env("GCP_PROJECT_ID", fallback="grantflow")
    topic_id = get_env(
        "FRONTEND_NOTIFICATIONS_PUBSUB_TOPIC", fallback="frontend-notifications"
    )
    topic_path = subscriber.topic_path(project=project_id, topic=topic_id)

    subscription_id = f"frontend-notifications-sub-{parent_id}"
    subscription_path = subscriber.subscription_path(
        project=project_id, subscription=subscription_id
    )

    with suppress(AlreadyExists):
        await run_sync(
            subscriber.create_subscription,
            request={
                "name": subscription_path,
                "topic": topic_path,
                "filter": f'attributes.parent_id = "{parent_id}"',
                "ack_deadline_seconds": 20,
            },
        )
    return str(subscription_path)


async def publish_notification[T](
    *,
    logger: "FilteringBoundLogger",
    parent_id: UUID,
    event: str,
    data: T,
) -> str:
    client = get_publisher_client()

    topic_path = client.topic_path(
        project=get_env("GCP_PROJECT_ID", fallback="grantflow"),
        topic=get_env(
            "FRONTEND_NOTIFICATIONS_PUBSUB_TOPIC", fallback="frontend-notifications"
        ),
    )
    try:
        message_data = serialize(
            WebsocketMessage(
                event=event,
                data=data,
                parent_id=parent_id,
                type="data",
            )
        )
        future = client.publish(
            topic=topic_path,
            data=message_data,
            attributes=serialize(
                {
                    "parent_id": str(parent_id),
                }
            ),
        )
        message_id = await run_sync(future.result)

        logger.info(
            "Published source processing message",
            message_id=message_id,
        )
        return str(message_id)
    except MessageTooLargeError as e:
        logger.error("Error publishing source processing message", error=str(e))
        raise BackendError(
            "Error publishing source processing message", context={"error": str(e)}
        ) from e


async def pull_notifications(
    *,
    logger: "FilteringBoundLogger",
    parent_id: UUID,
) -> list[WebsocketMessage[dict[str, Any]]]:
    client = get_subscriber_client()

    subscription_path = await ensure_subscription_for_parent_id(parent_id)

    response = await run_sync(
        client.pull,
        request={
            "subscription": subscription_path,
            "max_messages": 100,
        },
        timeout=5.0,
    )
    ret: list[WebsocketMessage[dict[str, Any]]] = []
    ack_ids: list[str] = []

    for received_message in response.received_messages:
        try:
            message = deserialize(
                received_message.message.data, WebsocketMessage[dict[str, Any]]
            )
            ret.append(message)
            ack_ids.append(received_message.ack_id)
        except (DeserializationError, ValueError, KeyError, TypeError) as e:
            logger.error("Error processing notification", error=str(e))
            ack_ids.append(received_message.ack_id)

    if ack_ids:
        await run_sync(
            client.acknowledge,
            request={
                "subscription": subscription_path,
                "ack_ids": ack_ids,
            },
        )

    return ret
