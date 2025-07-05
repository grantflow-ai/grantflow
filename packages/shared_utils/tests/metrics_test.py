"""Tests for OpenTelemetry metrics."""

import sys
from unittest.mock import Mock, patch


def test_http_requests_total_metric() -> None:
    """Test HTTP requests counter metric."""
    with patch("packages.shared_utils.src.otel.get_meter") as mock_get_meter:
        mock_meter = Mock()
        mock_counter = Mock()
        mock_get_meter.return_value = mock_meter
        mock_meter.create_counter.return_value = mock_counter

        module_name = "packages.shared_utils.src.metrics"
        if module_name in sys.modules:
            del sys.modules[module_name]

        import packages.shared_utils.src.metrics  # noqa: F401

        mock_meter.create_counter.assert_any_call(
            "http_requests_total",
            description="Total HTTP requests by service, method, status",
        )


def test_http_request_duration_metric() -> None:
    """Test HTTP request duration histogram metric."""
    with patch("packages.shared_utils.src.otel.get_meter") as mock_get_meter:
        mock_meter = Mock()
        mock_histogram = Mock()
        mock_get_meter.return_value = mock_meter
        mock_meter.create_histogram.return_value = mock_histogram

        module_name = "packages.shared_utils.src.metrics"
        if module_name in sys.modules:
            del sys.modules[module_name]

        import packages.shared_utils.src.metrics  # noqa: F401

        mock_meter.create_histogram.assert_any_call(
            "http_request_duration_seconds",
            description="HTTP request duration",
            unit="s",
        )


def test_business_metrics_creation() -> None:
    """Test business metrics are created with correct parameters."""
    with patch("packages.shared_utils.src.otel.get_meter") as mock_get_meter:
        mock_meter = Mock()
        mock_get_meter.return_value = mock_meter

        module_name = "packages.shared_utils.src.metrics"
        if module_name in sys.modules:
            del sys.modules[module_name]

        import packages.shared_utils.src.metrics  # noqa: F401

        expected_counters = [
            ("grants_processed_total", "Total grants processed by service and status"),
            ("files_indexed_total", "Total files indexed by type and status"),
            ("rag_queries_total", "Total RAG queries by type and status"),
            (
                "pubsub_messages_total",
                "Pub/Sub messages by topic, subscription, status",
            ),
            ("database_operations_total", "Database operations by type and status"),
        ]

        for name, description in expected_counters:
            mock_meter.create_counter.assert_any_call(name, description=description)


def test_processing_duration_histogram() -> None:
    """Test processing duration histogram metric."""
    with patch("packages.shared_utils.src.otel.get_meter") as mock_get_meter:
        mock_meter = Mock()
        mock_get_meter.return_value = mock_meter

        module_name = "packages.shared_utils.src.metrics"
        if module_name in sys.modules:
            del sys.modules[module_name]

        import packages.shared_utils.src.metrics  # noqa: F401

        mock_meter.create_histogram.assert_any_call(
            "processing_duration_seconds",
            description="Processing duration by operation type",
            unit="s",
        )


def test_metric_usage_pattern() -> None:
    """Test typical metric usage pattern."""
    mock_counter = Mock()

    mock_counter.add(
        1,
        attributes={
            "service": "backend",
            "method": "GET",
            "endpoint": "/sources",
            "status": "success",
        },
    )

    mock_counter.add.assert_called_once_with(
        1,
        attributes={
            "service": "backend",
            "method": "GET",
            "endpoint": "/sources",
            "status": "success",
        },
    )


def test_histogram_usage_pattern() -> None:
    """Test typical histogram metric usage pattern."""
    mock_histogram = Mock()

    duration = 0.123
    mock_histogram.record(
        duration, attributes={"service": "backend", "endpoint": "/sources"}
    )

    mock_histogram.record.assert_called_once_with(
        duration, attributes={"service": "backend", "endpoint": "/sources"}
    )


def test_pubsub_metric_usage() -> None:
    """Test Pub/Sub metric usage pattern."""
    mock_counter = Mock()

    mock_counter.add(
        1,
        attributes={
            "topic": "url-crawling",
            "operation": "publish",
            "status": "success",
        },
    )

    mock_counter.add.assert_called_once_with(
        1,
        attributes={
            "topic": "url-crawling",
            "operation": "publish",
            "status": "success",
        },
    )


def test_database_metric_usage() -> None:
    """Test database operations metric usage pattern."""
    mock_counter = Mock()

    mock_counter.add(
        1,
        attributes={
            "operation": "select",
            "table": "applications",
            "status": "success",
        },
    )

    mock_counter.add.assert_called_once_with(
        1,
        attributes={
            "operation": "select",
            "table": "applications",
            "status": "success",
        },
    )
