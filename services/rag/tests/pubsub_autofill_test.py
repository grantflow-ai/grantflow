import base64
import json
from typing import Any
from uuid import uuid4

from packages.shared_utils.src.pubsub import PubSubEvent, PubSubMessage

from services.rag.src.main import handle_pubsub_message


def create_pubsub_event(data: dict[str, Any]) -> PubSubEvent:
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
    from typing import cast

    from packages.shared_utils.src.pubsub import AutofillRequest

    application_id = str(uuid4())
    data = {
        "application_id": application_id,
        "autofill_type": "research_plan",
    }
    event = create_pubsub_event(data)

    result = handle_pubsub_message(event)
    autofill_result = cast("AutofillRequest", result)

    assert "autofill_type" in result
    assert autofill_result["autofill_type"] == "research_plan"
    assert str(autofill_result["application_id"]) == application_id


def test_handle_pubsub_message_autofill_research_deep_dive() -> None:
    from typing import cast

    from packages.shared_utils.src.pubsub import AutofillRequest

    application_id = str(uuid4())
    data = {
        "application_id": application_id,
        "autofill_type": "research_deep_dive",
    }
    event = create_pubsub_event(data)

    result = handle_pubsub_message(event)
    autofill_result = cast("AutofillRequest", result)

    assert "autofill_type" in result
    assert autofill_result["autofill_type"] == "research_deep_dive"
    assert str(autofill_result["application_id"]) == application_id


def test_handle_pubsub_message_rag_request_not_confused_with_autofill() -> None:
    data = {
        "parent_type": "grant_template",
        "parent_id": str(uuid4()),
    }
    event = create_pubsub_event(data)

    result = handle_pubsub_message(event)

    assert "autofill_type" not in result
    assert result["parent_type"] == "grant_template"


def test_handle_pubsub_message_grant_application_without_autofill() -> None:
    data = {
        "parent_type": "grant_application",
        "parent_id": str(uuid4()),
    }
    event = create_pubsub_event(data)

    result = handle_pubsub_message(event)

    assert "autofill_type" not in result
    assert result["parent_type"] == "grant_application"
