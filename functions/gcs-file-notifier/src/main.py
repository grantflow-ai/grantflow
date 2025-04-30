from http import HTTPStatus

import functions_framework
from httpx import Client
from cloudevents.http.event import CloudEvent
from packages.shared_utils.src.env import get_env
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)

client = Client(
    base_url=get_env("INDEXER_URL"),
)

@functions_framework.cloud_event
def process_gcs_event(cloud_event: CloudEvent) -> str:
    event_data = cloud_event.data
    if not event_data:
        logger.error("No data in event")
        return "No data in event"

    logger.info("processing gcs event", event=event_data)
    response = client.post(
        url="/",
        json={
            "file_path": event_data.get("name"),
        },
    )

    if response.status_code != HTTPStatus.CREATED:
        logger.error("Failed to forward event", response=response.json())
        return f"Failed to forward event: {response.status_code} - {response.text}"

    logger.info("Event forwarded successfully", response=response.json())
    return f"Event forwarded successfully: {response.status_code} - {response.text}"
