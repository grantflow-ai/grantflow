"""Tests for OpenTelemetry configuration."""

import os
from unittest.mock import Mock, patch

from packages.shared_utils.src.otel import configure_otel, get_meter, get_tracer


def test_configure_otel_development_environment() -> None:
    """Test OTEL configuration in development environment."""
    with (
        patch.dict(
            os.environ,
            {"ENVIRONMENT": "development", "GOOGLE_CLOUD_PROJECT": "test-project"},
        ),
        patch("packages.shared_utils.src.otel.TracerProvider") as mock_tracer_provider,
        patch("packages.shared_utils.src.otel.MeterProvider"),
        patch(
            "packages.shared_utils.src.otel.SQLAlchemyInstrumentor"
        ) as mock_sqlalchemy,
        patch("packages.shared_utils.src.otel.HTTPXClientInstrumentor") as mock_httpx,
    ):
        mock_provider_instance = Mock()
        mock_tracer_provider.return_value = mock_provider_instance

        configure_otel("test-service")

        mock_tracer_provider.assert_called_once()
        call_args = mock_tracer_provider.call_args[1]
        resource = call_args["resource"]

        assert resource.attributes["service.name"] == "test-service"
        assert resource.attributes["service.environment"] == "development"
        assert resource.attributes["cloud.provider"] == "gcp"
        assert resource.attributes["cloud.account.id"] == "test-project"

        mock_sqlalchemy.return_value.instrument.assert_called_once()
        mock_httpx.return_value.instrument.assert_called_once()


def test_configure_otel_production_with_cloud_trace() -> None:
    """Test OTEL configuration in production with Cloud Trace enabled."""
    with (
        patch.dict(
            os.environ,
            {"ENVIRONMENT": "production", "GOOGLE_CLOUD_PROJECT": "prod-project"},
        ),
        patch("packages.shared_utils.src.otel.TracerProvider") as mock_tracer_provider,
        patch(
            "packages.shared_utils.src.otel.CloudTraceSpanExporter"
        ) as mock_cloud_trace,
        patch("packages.shared_utils.src.otel.BatchSpanProcessor") as mock_processor,
        patch("packages.shared_utils.src.otel.SQLAlchemyInstrumentor"),
        patch("packages.shared_utils.src.otel.HTTPXClientInstrumentor"),
    ):
        mock_provider_instance = Mock()
        mock_tracer_provider.return_value = mock_provider_instance
        mock_cloud_trace_instance = Mock()
        mock_cloud_trace.return_value = mock_cloud_trace_instance
        mock_processor_instance = Mock()
        mock_processor.return_value = mock_processor_instance

        configure_otel("prod-service")

        mock_cloud_trace.assert_called_once_with(project_id="prod-project")
        mock_processor.assert_called_once_with(mock_cloud_trace_instance)
        mock_provider_instance.add_span_processor.assert_called_once_with(
            mock_processor_instance
        )


def test_configure_otel_development_with_cloud_trace_enabled() -> None:
    """Test OTEL configuration in development with ENABLE_CLOUD_TRACE."""
    with (
        patch.dict(
            os.environ,
            {
                "ENVIRONMENT": "development",
                "ENABLE_CLOUD_TRACE": "1",
                "GOOGLE_CLOUD_PROJECT": "dev-project",
            },
        ),
        patch("packages.shared_utils.src.otel.TracerProvider") as mock_tracer_provider,
        patch(
            "packages.shared_utils.src.otel.CloudTraceSpanExporter"
        ) as mock_cloud_trace,
        patch("packages.shared_utils.src.otel.BatchSpanProcessor"),
    ):
        mock_provider_instance = Mock()
        mock_tracer_provider.return_value = mock_provider_instance

        configure_otel("dev-service")

        mock_cloud_trace.assert_called_once_with(project_id="dev-project")


def test_get_tracer_with_name() -> None:
    """Test getting tracer with specific name."""
    with patch("packages.shared_utils.src.otel.trace.get_tracer") as mock_get_tracer:
        mock_tracer = Mock()
        mock_get_tracer.return_value = mock_tracer

        result = get_tracer("custom-tracer")

        mock_get_tracer.assert_called_once_with("custom-tracer")
        assert result == mock_tracer


def test_get_tracer_without_name() -> None:
    """Test getting tracer without specific name uses module name."""
    with patch("packages.shared_utils.src.otel.trace.get_tracer") as mock_get_tracer:
        mock_tracer = Mock()
        mock_get_tracer.return_value = mock_tracer

        result = get_tracer()

        mock_get_tracer.assert_called_once_with("packages.shared_utils.src.otel")
        assert result == mock_tracer


def test_get_meter_with_name() -> None:
    """Test getting meter with specific name."""
    with patch("packages.shared_utils.src.otel.metrics.get_meter") as mock_get_meter:
        mock_meter = Mock()
        mock_get_meter.return_value = mock_meter

        result = get_meter("custom-meter")

        mock_get_meter.assert_called_once_with("custom-meter")
        assert result == mock_meter


def test_get_meter_without_name() -> None:
    """Test getting meter without specific name uses module name."""
    with patch("packages.shared_utils.src.otel.metrics.get_meter") as mock_get_meter:
        mock_meter = Mock()
        mock_get_meter.return_value = mock_meter

        result = get_meter()

        mock_get_meter.assert_called_once_with("packages.shared_utils.src.otel")
        assert result == mock_meter