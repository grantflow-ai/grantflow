import json
from http import HTTPStatus
from unittest.mock import MagicMock, patch

import pytest
from cloudevents.http.event import CloudEvent
from httpx import Response, RequestError


@pytest.fixture
def mock_event():
    return CloudEvent(
        {
            "id": "test-id",
            "source": "test-source",
            "type": "test-type",
            "specversion": "1.0",
        },
        {
            "name": "test-file.pdf",
            "bucket": "test-bucket",
        },
    )


@pytest.fixture
def mock_event_no_data():
    return CloudEvent(
        {
            "id": "test-id",
            "source": "test-source",
            "type": "test-type",
            "specversion": "1.0",
        },
        None,
    )


@patch("functions.gcs_notifier.src.main.client.post")
def test_process_gcs_event_success(mock_post, mock_event):
    from functions.gcs_notifier.src.main import process_gcs_event

    mock_response = MagicMock()
    mock_response.status_code = HTTPStatus.CREATED
    mock_response.json.return_value = {"message": "File processed successfully"}
    mock_post.return_value = mock_response

    result = process_gcs_event(mock_event)

    mock_post.assert_called_once_with(
        url="/",
        json={
            "file_path": "test-file.pdf",
        },
    )
    assert result == "Event forwarded successfully"


@patch("functions.gcs_notifier.src.main.client.post")
def test_process_gcs_event_no_data(mock_post, mock_event_no_data):
    from functions.gcs_notifier.src.main import process_gcs_event

    result = process_gcs_event(mock_event_no_data)

    mock_post.assert_not_called()
    assert result == "No data in event"


@patch("functions.gcs_notifier.src.main.client.post")
def test_process_gcs_event_failure(mock_post, mock_event):
    from functions.gcs_notifier.src.main import process_gcs_event

    mock_response = MagicMock()
    mock_response.status_code = HTTPStatus.BAD_REQUEST
    mock_response.json.return_value = {"error": "Invalid request"}
    mock_post.return_value = mock_response

    with pytest.raises(Exception, match="Event forwarded failed"):
        process_gcs_event(mock_event)

    mock_post.assert_called_once()


@patch("functions.gcs_notifier.src.main.client.post")
def test_process_gcs_event_request_content(mock_post, mock_event):
    from functions.gcs_notifier.src.main import process_gcs_event

    mock_response = MagicMock()
    mock_response.status_code = HTTPStatus.CREATED
    mock_response.json.return_value = {"message": "Success"}
    mock_post.return_value = mock_response

    process_gcs_event(mock_event)

    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert kwargs["url"] == "/"
    assert kwargs["json"]["file_path"] == "test-file.pdf"


@patch("functions.gcs_notifier.src.main.get_logger")
@patch("functions.gcs_notifier.src.main.client.post")
def test_process_gcs_event_logging(mock_post, mock_get_logger, mock_event):
    from functions.gcs_notifier.src.main import process_gcs_event

    mock_logger = MagicMock()
    mock_get_logger.return_value = mock_logger

    mock_response = MagicMock()
    mock_response.status_code = HTTPStatus.CREATED
    mock_response.json.return_value = {"message": "Success"}
    mock_post.return_value = mock_response

    with patch("functions.gcs_notifier.src.main.logger", mock_logger):
        process_gcs_event(mock_event)

    assert mock_logger.info.call_count == 2
    mock_logger.error.assert_not_called()


@patch("functions.gcs_notifier.src.main.client.post")
def test_process_gcs_event_connection_error(mock_post, mock_event):
    from functions.gcs_notifier.src.main import process_gcs_event

    # Simulate a connection error
    mock_post.side_effect = RequestError("Connection error")

    with pytest.raises(RequestError, match="Connection error"):
        process_gcs_event(mock_event)

    mock_post.assert_called_once()


@patch("functions.gcs_notifier.src.main.client.post")
def test_process_gcs_event_empty_file_path(mock_post):
    from functions.gcs_notifier.src.main import process_gcs_event

    # Create an event with empty file path
    event = CloudEvent(
        {
            "id": "test-id",
            "source": "test-source",
            "type": "test-type",
            "specversion": "1.0",
        },
        {
            "name": "",  # Empty file path
            "bucket": "test-bucket",
        },
    )

    mock_response = MagicMock()
    mock_response.status_code = HTTPStatus.CREATED
    mock_response.json.return_value = {"message": "Success"}
    mock_post.return_value = mock_response

    result = process_gcs_event(event)

    mock_post.assert_called_once_with(
        url="/",
        json={
            "file_path": "",
        },
    )
    assert result == "Event forwarded successfully"


@patch("functions.gcs_notifier.src.main.get_logger")
@patch("functions.gcs_notifier.src.main.client.post")
def test_process_gcs_event_error_logging(mock_post, mock_get_logger, mock_event_no_data):
    from functions.gcs_notifier.src.main import process_gcs_event

    mock_logger = MagicMock()
    mock_get_logger.return_value = mock_logger

    with patch("functions.gcs_notifier.src.main.logger", mock_logger):
        process_gcs_event(mock_event_no_data)

    mock_logger.error.assert_called_once_with("No data in event")
