import json
from uuid import UUID

from google.cloud.pubsub_v1 import PublisherClient
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.shared_types import ParentType

logger = get_logger(__name__)


class PubSubClient:
    def __init__(self) -> None:
        self._publisher = PublisherClient()
        self._project_id = get_env("GCP_PROJECT_ID", fallback="grantflow")
        self._url_crawling_topic = get_env("URL_CRAWLING_TOPIC", fallback="url-crawling")
        self._topic_path = self._publisher.topic_path(self._project_id, self._url_crawling_topic)

    async def publish_url_crawling_task(
        self,
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
        data = {
            "url": url,
            "parent_type": parent_type,
            "parent_id": str(parent_id),
        }

        if workspace_id:
            data["workspace_id"] = str(workspace_id)

        try:
            message_data = json.dumps(data).encode()
            future = self._publisher.publish(self._topic_path, message_data)
            message_id = future.result()
            logger.info(
                "Published message to crawl URL",
                message_id=message_id,
                url=url,
                parent_type=parent_type,
                parent_id=str(parent_id),
            )
            return str(message_id)
        except Exception as e:
            logger.error("Error publishing URL crawling message", exc_info=e)
            raise
