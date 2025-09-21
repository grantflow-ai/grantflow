import base64
from uuid import uuid4

import pytest
from packages.shared_utils.src.pubsub import (
    GrantApplicationRagRequest,
    GrantTemplateRagRequest,
    PubSubEvent,
    PubSubMessage,
    RagRequest,
    ResearchDeepDiveAutofillRequest,
    ResearchPlanAutofillRequest,
)
from packages.shared_utils.src.serialization import serialize

from services.rag.src.main import handle_pubsub_message

TraceId = str


@pytest.fixture
def trace_id() -> TraceId:
    return "test-trace-id"


def create_pubsub_event(request_obj: RagRequest) -> PubSubEvent:
    serialized_data = serialize(request_obj)
    encoded_data = base64.b64encode(serialized_data).decode()
    return PubSubEvent(
        message=PubSubMessage(
            data=encoded_data,
            message_id="test-message-id",
            attributes={"trace_id": request_obj.trace_id},
        ),
        subscription="test-subscription",
    )


def test_handle_pubsub_message_autofill_research_plan(trace_id: TraceId) -> None:
    application_id = uuid4()
    request = ResearchPlanAutofillRequest(
        application_id=application_id,
        trace_id=trace_id,
    )
    event = create_pubsub_event(request)

    result = handle_pubsub_message(event)

    assert isinstance(result, ResearchPlanAutofillRequest)
    assert result.application_id == application_id
    assert result.trace_id == trace_id


def test_handle_pubsub_message_autofill_research_deep_dive(trace_id: TraceId) -> None:
    application_id = uuid4()
    request = ResearchDeepDiveAutofillRequest(
        application_id=application_id,
        trace_id=trace_id,
    )
    event = create_pubsub_event(request)

    result = handle_pubsub_message(event)

    assert isinstance(result, ResearchDeepDiveAutofillRequest)
    assert result.application_id == application_id
    assert result.trace_id == trace_id


def test_handle_pubsub_message_rag_request_not_confused_with_autofill(trace_id: TraceId) -> None:
    parent_id = uuid4()
    request = GrantTemplateRagRequest(
        parent_id=parent_id,
        trace_id=trace_id,
    )
    event = create_pubsub_event(request)

    result = handle_pubsub_message(event)

    assert isinstance(result, GrantTemplateRagRequest)
    assert result.parent_id == parent_id
    assert result.trace_id == trace_id


def test_handle_pubsub_message_grant_application_without_autofill(trace_id: TraceId) -> None:
    parent_id = uuid4()
    request = GrantApplicationRagRequest(
        parent_id=parent_id,
        trace_id=trace_id,
    )
    event = create_pubsub_event(request)

    result = handle_pubsub_message(event)

    assert isinstance(result, GrantApplicationRagRequest)
    assert result.parent_id == parent_id
    assert result.trace_id == trace_id
