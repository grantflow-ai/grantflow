import base64
import json
from typing import Any
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from packages.shared_utils.src.exceptions import ValidationError
from packages.shared_utils.src.pubsub import (
    GrantApplicationRagRequest,
    GrantTemplateRagRequest,
    PubSubEvent,
    PubSubMessage,
    ResearchPlanAutofillRequest,
)
from packages.shared_utils.src.serialization import serialize

from services.rag.src.enums import GrantApplicationStageEnum, GrantTemplateStageEnum
from services.rag.src.main import handle_pubsub_message, handle_request

handle_request_fn = handle_request.fn


def create_pubsub_event_from_request(request: object) -> PubSubEvent:
    serialized_data = serialize(request)
    encoded_data = base64.b64encode(serialized_data).decode()
    return PubSubEvent(
        message=PubSubMessage(
            data=encoded_data,
            message_id="test-message-id",
            attributes={},
        ),
        subscription="test-subscription",
    )


def create_pubsub_event(data: dict[str, str]) -> PubSubEvent:
    encoded_data = base64.b64encode(json.dumps(data).encode()).decode()
    return PubSubEvent(
        message=PubSubMessage(
            data=encoded_data,
            message_id="test-message-id",
            attributes={},
        ),
        subscription="test-subscription",
    )


def test_handle_pubsub_message_valid_grant_template() -> None:
    request = GrantTemplateRagRequest(
        parent_id=UUID("123e4567-e89b-12d3-a456-426614174000"),
        stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        trace_id="test-trace",
    )
    event = create_pubsub_event_from_request(request)

    result = handle_pubsub_message(event)

    assert isinstance(result, GrantTemplateRagRequest)
    assert result.parent_id == UUID("123e4567-e89b-12d3-a456-426614174000")
    assert result.stage == GrantTemplateStageEnum.EXTRACT_CFP_CONTENT
    assert result.trace_id == "test-trace"


def test_handle_pubsub_message_valid_grant_application() -> None:
    request = GrantApplicationRagRequest(
        parent_id=UUID("123e4567-e89b-12d3-a456-426614174000"),
        stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id="test-trace",
    )
    event = create_pubsub_event_from_request(request)

    result = handle_pubsub_message(event)

    assert isinstance(result, GrantApplicationRagRequest)
    assert result.parent_id == UUID("123e4567-e89b-12d3-a456-426614174000")
    assert result.stage == GrantApplicationStageEnum.GENERATE_SECTIONS
    assert result.trace_id == "test-trace"


def test_handle_pubsub_message_valid_autofill_request() -> None:
    request = ResearchPlanAutofillRequest(
        application_id=UUID("123e4567-e89b-12d3-a456-426614174000"),
        trace_id="test-trace",
        field_name="background_context",
    )
    event = create_pubsub_event_from_request(request)

    result = handle_pubsub_message(event)

    assert isinstance(result, ResearchPlanAutofillRequest)
    assert result.application_id == UUID("123e4567-e89b-12d3-a456-426614174000")
    assert result.field_name == "background_context"
    assert result.trace_id == "test-trace"


def test_handle_pubsub_message_invalid_request_type() -> None:
    data = {"invalid": "request"}
    event = create_pubsub_event(data)

    with pytest.raises(ValidationError, match="Invalid pubsub message format"):
        handle_pubsub_message(event)


def test_handle_pubsub_message_missing_data() -> None:
    event = PubSubEvent(
        message=PubSubMessage(
            data=None,
            message_id="test-message-id",
            attributes={},
        ),
        subscription="test-subscription",
    )

    with pytest.raises(ValidationError, match="PubSub message missing data field"):
        handle_pubsub_message(event)


def test_handle_pubsub_message_invalid_json() -> None:
    event = PubSubEvent(
        message=PubSubMessage(
            data=base64.b64encode(b"invalid json").decode(),
            message_id="test-message-id",
            attributes={},
        ),
        subscription="test-subscription",
    )

    with pytest.raises(ValidationError, match="Invalid pubsub message format"):
        handle_pubsub_message(event)


def test_handle_pubsub_message_missing_required_fields() -> None:
    data = {"parent_id": "123e4567-e89b-12d3-a456-426614174000"}
    event = create_pubsub_event(data)

    with pytest.raises(ValidationError, match="Invalid pubsub message format"):
        handle_pubsub_message(event)


async def test_handle_request_invalid_message_raises_validation_error() -> None:
    mock_session_maker = AsyncMock()

    event = PubSubEvent(
        message=PubSubMessage(
            data=None,
            message_id="test-message-id",
            attributes={},
        ),
        subscription="test-subscription",
    )

    with pytest.raises(ValidationError, match="PubSub message missing data field"):
        await handle_request_fn(data=event, session_maker=mock_session_maker)

    mock_session_maker.assert_not_called()


async def test_handle_request_grant_template_success(
    async_session_maker: Any,
    grant_application: Any,
    grant_template: Any,
) -> None:
    # Debug: verify template exists in DB
    from packages.db.src.query_helpers import select_active
    from packages.db.src.tables import GrantTemplate

    async with async_session_maker() as session:
        template = await session.scalar(
            select_active(GrantTemplate).where(GrantTemplate.id == grant_template.id)
        )
        assert template is not None, f"Template {grant_template.id} not found in database"

    request = GrantTemplateRagRequest(
        parent_id=grant_template.id,
        stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        trace_id="test-trace",
    )
    event = create_pubsub_event_from_request(request)

    with patch(
        "services.rag.src.grant_template.pipeline.handle_grant_template_pipeline",
        new_callable=AsyncMock,
    ) as mock_pipeline:
        await handle_request_fn(data=event, session_maker=async_session_maker)

        mock_pipeline.assert_called_once_with(
            grant_template=template,
            session_maker=async_session_maker,
            generation_stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
            trace_id="test-trace",
        )


async def test_handle_request_grant_application_success(
    async_session_maker: Any,
    grant_application: Any,
    grant_template: Any,
) -> None:
    # Link grant template to application
    async with async_session_maker() as session:
        grant_application.grant_template_id = grant_template.id
        session.add(grant_application)
        await session.commit()

    request = GrantApplicationRagRequest(
        parent_id=grant_application.id,
        stage=GrantApplicationStageEnum.GENERATE_SECTIONS,
        trace_id="test-trace",
    )
    event = create_pubsub_event_from_request(request)

    with patch(
        "services.rag.src.grant_application.pipeline.handle_grant_application_pipeline",
        new_callable=AsyncMock,
    ) as mock_pipeline:
        await handle_request_fn(data=event, session_maker=async_session_maker)

        mock_pipeline.assert_called_once()
        call_args = mock_pipeline.call_args
        assert call_args.kwargs["session_maker"] == async_session_maker
        assert call_args.kwargs["generation_stage"] == GrantApplicationStageEnum.GENERATE_SECTIONS
        assert call_args.kwargs["trace_id"] == "test-trace"


async def test_handle_request_autofill_success(
    async_session_maker: Any,
    grant_application: Any,
) -> None:
    request = ResearchPlanAutofillRequest(
        application_id=grant_application.id,
        trace_id="test-trace",
        field_name="background_context",
    )
    event = create_pubsub_event_from_request(request)

    with patch(
        "services.rag.src.autofill.handler.handle_autofill_request",
        new_callable=AsyncMock,
    ) as mock_autofill:
        await handle_request_fn(data=event, session_maker=async_session_maker)

        mock_autofill.assert_called_once_with(
            request=request,
            application=grant_application,
            session_maker=async_session_maker,
        )


async def test_handle_request_grant_template_not_found(
    async_session_maker: Any,
) -> None:
    # Use a non-existent ID
    request = GrantTemplateRagRequest(
        parent_id=UUID("123e4567-e89b-12d3-a456-426614174000"),
        stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        trace_id="test-trace",
    )
    event = create_pubsub_event_from_request(request)

    with pytest.raises(ValidationError, match=r"Grant template .* not found"):
        await handle_request_fn(data=event, session_maker=async_session_maker)


async def test_handle_request_pipeline_error_propagates(
    async_session_maker: Any,
    grant_template: Any,
) -> None:
    request = GrantTemplateRagRequest(
        parent_id=grant_template.id,
        stage=GrantTemplateStageEnum.EXTRACT_CFP_CONTENT,
        trace_id="test-trace",
    )
    event = create_pubsub_event_from_request(request)

    error = Exception("Pipeline failed")

    with (
        patch(
            "services.rag.src.grant_template.pipeline.handle_grant_template_pipeline",
            side_effect=error,
        ),
        pytest.raises(Exception, match="Pipeline failed"),
    ):
        await handle_request_fn(data=event, session_maker=async_session_maker)
