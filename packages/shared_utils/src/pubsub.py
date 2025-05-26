from typing import NotRequired, TypedDict
from uuid import UUID

from packages.shared_utils.src.shared_types import ParentType


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
