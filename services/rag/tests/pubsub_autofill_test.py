import base64
import json
from uuid import uuid4

from packages.shared_utils.src.pubsub import PubSubEvent, PubSubMessage

from services.rag.src.main import handle_pubsub_message


def create_pubsub_event(data: dict) -> PubSubEvent:
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
    """Test that autofill requests are correctly identified and not confused with RagRequests."""
    application_id = str(uuid4())
    data = {
        "application_id": application_id,
        "autofill_type": "research_plan",
    }
    event = create_pubsub_event(data)

    result = handle_pubsub_message(event)

    assert "autofill_type" in result
    assert result["autofill_type"] == "research_plan"
    assert str(result["application_id"]) == application_id


def test_handle_pubsub_message_autofill_research_deep_dive() -> None:
    """Test that autofill requests are correctly parsed."""
    application_id = str(uuid4())
    data = {
        "application_id": application_id,
        "autofill_type": "research_deep_dive",
    }
    event = create_pubsub_event(data)

    result = handle_pubsub_message(event)

    assert "autofill_type" in result
    assert result["autofill_type"] == "research_deep_dive"
    assert str(result["application_id"]) == application_id


def test_handle_pubsub_message_rag_request_not_confused_with_autofill() -> None:
    """Test that regular RagRequests are still correctly identified."""
    data = {
        "parent_type": "grant_template",
        "parent_id": str(uuid4()),
    }
    event = create_pubsub_event(data)

    result = handle_pubsub_message(event)

    assert "autofill_type" not in result
    assert result["parent_type"] == "grant_template"


def test_handle_pubsub_message_grant_application_without_autofill() -> None:
    """Test that grant_application requests without autofill_type are treated as RagRequests."""
    data = {
        "parent_type": "grant_application",
        "parent_id": str(uuid4()),
    }
    event = create_pubsub_event(data)

    result = handle_pubsub_message(event)

    assert "autofill_type" not in result
    assert result["parent_type"] == "grant_application"
