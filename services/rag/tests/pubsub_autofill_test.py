import base64
import json
from typing import Any
from uuid import uuid4

from packages.shared_utils.src.pubsub import (
    GrantApplicationRagRequest,
    GrantTemplateRagRequest,
    PubSubEvent,
    PubSubMessage,
    ResearchDeepDiveAutofillRequest,
    ResearchPlanAutofillRequest,
)
from packages.shared_utils.src.serialization import serialize

from services.rag.src.main import handle_pubsub_message


def create_pubsub_event_from_struct(request_obj: Any) -> PubSubEvent:
    """Create a PubSub event from a msgspec struct."""
    serialized_data = serialize(request_obj)
    encoded_data = base64.b64encode(serialized_data).decode()
    return PubSubEvent(
        message=PubSubMessage(
            data=encoded_data,
            message_id="test-message-id",
            attributes={},
        ),
        subscription="test-subscription",
    )


def create_pubsub_event(data: dict[str, Any]) -> PubSubEvent:
    """Legacy function for backward compatibility with dict data."""
    encoded_data = base64.b64encode(json.dumps(data).encode()).decode()
    return PubSubEvent(
        message=PubSubMessage(
            data=encoded_data,
            message_id="test-message-id",
            attributes={},
        ),
        subscription="test-subscription",
    )


def test_handle_pubsub_message_autofill_research_plan() -> None:
    application_id = uuid4()
    request = ResearchPlanAutofillRequest(
        application_id=application_id,
        trace_id="test-trace-id",
    )
    event = create_pubsub_event_from_struct(request)

    result = handle_pubsub_message(event)

    assert isinstance(result, ResearchPlanAutofillRequest)
    assert result.application_id == application_id
    assert result.trace_id == "test-trace-id"


def test_handle_pubsub_message_autofill_research_deep_dive() -> None:
    application_id = uuid4()
    request = ResearchDeepDiveAutofillRequest(
        application_id=application_id,
        trace_id="test-trace-id",
    )
    event = create_pubsub_event_from_struct(request)

    result = handle_pubsub_message(event)

    assert isinstance(result, ResearchDeepDiveAutofillRequest)
    assert result.application_id == application_id
    assert result.trace_id == "test-trace-id"


def test_handle_pubsub_message_rag_request_not_confused_with_autofill() -> None:
    from services.rag.src.enums import GrantTemplateStageEnum

    parent_id = uuid4()
    request = GrantTemplateRagRequest(
        parent_id=parent_id,
        stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        trace_id="test-trace-id",
    )
    event = create_pubsub_event_from_struct(request)

    result = handle_pubsub_message(event)

    assert isinstance(result, GrantTemplateRagRequest)
    assert result.parent_id == parent_id
    assert result.stage == GrantTemplateStageEnum.EXTRACT_CFP_CONTENT
    assert result.trace_id == "test-trace-id"


def test_handle_pubsub_message_grant_application_without_autofill() -> None:
    from services.rag.src.enums import GrantApplicationStageEnum

    parent_id = uuid4()
    request = GrantApplicationRagRequest(
        parent_id=parent_id,
        stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id="test-trace-id",
    )
    event = create_pubsub_event_from_struct(request)

    result = handle_pubsub_message(event)

    assert isinstance(result, GrantApplicationRagRequest)
    assert result.parent_id == parent_id
    assert result.stage == GrantApplicationStageEnum.GENERATE_SECTIONS
    assert result.trace_id == "test-trace-id"
