from typing import cast
from uuid import UUID

from google.cloud.pubsub_v1 import PublisherClient
from google.cloud.pubsub_v1.publisher.exceptions import MessageTooLargeError
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.exceptions import BackendError
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.pubsub import CrawlingRequest
from packages.shared_utils.src.ref import Ref
from packages.shared_utils.src.serialization import serialize
from packages.shared_utils.src.shared_types import ParentType
from packages.shared_utils.src.sync import run_sync

logger = get_logger(__name__)

client_ref = Ref[PublisherClient]()


def get_pubsub_client() -> PublisherClient:
    if not client_ref.value:
        client = PublisherClient()
        client.topic_path(
            project=get_env("GCP_PROJECT_ID", fallback="grantflow"),
            topic=get_env("URL_CRAWLING_PUBSUB_TOPIC", fallback="url-crawling"),
        )
        client_ref.value = client

    return client_ref.value


async def publish_url_crawling_task(
    *,
    url: str,
    parent_type: ParentType,
    parent_id: str | UUID,
    workspace_id: str | UUID | None = None,
) -> str:
    """
    Publish a message to trigger URL crawling.

    Args:
        url: The URL to crawl
        parent_type: The type of parent (grant_application, funding_organization, grant_template)
        parent_id: The ID of the parent
        workspace_id: Optional workspace ID for grant_application and grant_template parent types

    Returns:
        Message ID of the published message
    """
    client = get_pubsub_client()

    data = CrawlingRequest(
        url=url,
        parent_type=parent_type,
        parent_id=UUID(str(parent_id)),
    )

    if workspace_id:
        data["workspace_id"] = UUID(str(workspace_id))

    try:
        message_data = serialize(data)
        future = client.publish(topic=get_env("URL_CRAWLING_PUBSUB_TOPIC", fallback="url-crawling"), data=message_data)
        message_id = await run_sync(future.result)
        logger.info(
            "Published message to crawl URL",
            message_id=message_id,
            url=url,
            parent_type=parent_type,
            parent_id=str(parent_id),
        )
        return cast("str", message_id)
    except MessageTooLargeError as e:
        logger.error("Error publishing URL crawling message", exc_info=e)
        raise BackendError("Error publishing URL crawling message", context={"error": str(e)}) from e
