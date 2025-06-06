from typing import TYPE_CHECKING, NotRequired, TypedDict
from uuid import UUID

import google.cloud.pubsub_v1 as pubsub
from google.cloud.pubsub_v1.publisher.exceptions import MessageTooLargeError

from packages.db.src.enums import SourceIndexingStatusEnum
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import BackendError, DeserializationError
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.serialization import deserialize, serialize
from packages.shared_utils.src.shared_types import ParentType
from packages.shared_utils.src.sync import run_sync

if TYPE_CHECKING:
    from structlog.typing import FilteringBoundLogger

client_ref = Ref[pubsub.PublisherClient]()
subscriber_client_ref = Ref[pubsub.SubscriberClient]()


class PubSubMessage(TypedDict):
    message_id: str
    publish_time: str
    data: str
    attributes: dict[str, str]


class PubSubEvent(TypedDict):
    message: PubSubMessage


class CrawlingRequest(TypedDict):
    parent_id: UUID
    parent_type: ParentType
    workspace_id: NotRequired[UUID]
    url: str


class SourceProcessingResult(TypedDict):
    parent_id: UUID
    parent_type: ParentType
    rag_source_id: UUID
    indexing_status: SourceIndexingStatusEnum
    identifier: str


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
    parent_type: ParentType,
    parent_id: str | UUID,
    workspace_id: str | UUID | None = None,
) -> str:
    client = get_publisher_client()

    data = CrawlingRequest(
        url=url,
        parent_type=parent_type,
        parent_id=UUID(str(parent_id)),
    )

    if workspace_id:
        data["workspace_id"] = UUID(str(workspace_id))

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
            parent_type=parent_type,
            parent_id=str(parent_id),
        )
        return str(message_id)
    except MessageTooLargeError as e:
        logger.error("Error publishing URL crawling message", error=str(e))
        raise BackendError("Error publishing URL crawling message", context={"error": str(e)}) from e


async def publish_source_processing_message(
    *,
    logger: "FilteringBoundLogger",
    parent_id: UUID,
    parent_type: ParentType,
    rag_source_id: UUID,
    indexing_status: SourceIndexingStatusEnum,
    identifier: str,
) -> str:
    client = get_publisher_client()

    data = SourceProcessingResult(
        parent_type=parent_type,
        parent_id=parent_id,
        rag_source_id=rag_source_id,
        indexing_status=indexing_status,
        identifier=identifier,
    )

    topic_path = client.topic_path(
        project=get_env("GCP_PROJECT_ID", fallback="grantflow"),
        topic=get_env("SOURCE_PROCESSING_NOTIFICATIONS_PUBSUB_TOPIC", fallback="source-processing-notifications"),
    )
    try:
        message_data = serialize(data)
        future = client.publish(topic=topic_path, data=message_data)
        message_id = await run_sync(future.result)

        logger.info(
            "Published source processing message",
            message_id=message_id,
            rag_source_id=str(rag_source_id),
        )
        return str(message_id)
    except MessageTooLargeError as e:
        logger.error("Error publishing source processing message", error=str(e))
        raise BackendError("Error publishing source processing message", context={"error": str(e)}) from e


async def pull_source_processing_notifications(
    *,
    logger: "FilteringBoundLogger",
    parent_id: UUID,
) -> list[SourceProcessingResult]:
    client = get_subscriber_client()

    subscription_path = client.subscription_path(
        project=get_env("GCP_PROJECT_ID", fallback="grantflow"),
        subscription=get_env(
            "SOURCE_PROCESSING_NOTIFICATIONS_SUBSCRIPTION", fallback="source-processing-notifications-sub"
        ),
    )

    response = await run_sync(
        client.pull,
        request={
            "subscription": subscription_path,
            "max_messages": 100,
        },
        timeout=5.0,
    )
    ret: list[SourceProcessingResult] = []
    ack_ids: list[str] = []
    nack_ids: list[str] = []

    for received_message in response.received_messages:
        try:
            data = deserialize(received_message.message.data, SourceProcessingResult)
            if data["parent_id"] != parent_id:
                nack_ids.append(received_message.ack_id)
                continue
            ack_ids.append(received_message.ack_id)
            ret.append(data)
            continue
        except (DeserializationError, ValueError, KeyError, TypeError) as e:
            logger.error("Error processing source processing notification", error=str(e))
            nack_ids.append(received_message.ack_id)

    if ack_ids:
        await run_sync(
            client.acknowledge,
            request={
                "subscription": subscription_path,
                "ack_ids": ack_ids,
            },
        )

    if nack_ids:
        await run_sync(
            client.modify_ack_deadline,
            request={
                "subscription": subscription_path,
                "ack_ids": nack_ids,
                "ack_deadline_seconds": 0,
            },
        )

    return ret
