"""Test script to verify OpenTelemetry integration."""

import asyncio
import os
import sys
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).parent.parent))

from packages.shared_utils.src.logger import get_logger
from packages.shared_utils.src.otel import configure_otel
from packages.shared_utils.src.pubsub import publish_rag_task
from packages.shared_utils.src.tracing import add_span_attributes, start_span_with_trace_id


async def test_basic_tracing() -> None:
    """Test basic tracing functionality."""
    logger = get_logger(__name__)

    trace_id = str(uuid4())

    logger.info("Starting OpenTelemetry test", trace_id=trace_id)

    with start_span_with_trace_id(
        "test.main_operation",
        trace_id=trace_id,
        test_attribute="test_value",
    ):
        logger.info("Inside main span")

        with start_span_with_trace_id(
            "test.sub_operation",
            trace_id=trace_id,
        ):
            logger.info("Inside sub span")

            add_span_attributes(
                operation_type="test",
                test_id="123",
            )

            await asyncio.sleep(0.1)

        logger.info("Sub operation completed")

        try:
            with start_span_with_trace_id(
                "test.error_operation",
                trace_id=trace_id,
            ):
                logger.warning("About to raise an error")
                raise ValueError("Test error for tracing")
        except ValueError:
            logger.info("Error was caught and recorded in span")

    logger.info("Test completed", trace_id=trace_id)


async def test_pubsub_tracing() -> None:
    """Test Pub/Sub tracing integration."""
    logger = get_logger(__name__)

    trace_id = str(uuid4())

    logger.info("Testing Pub/Sub tracing", trace_id=trace_id)

    try:
        message_id = await publish_rag_task(
            logger=logger,
            parent_type="grant_application",
            parent_id=str(uuid4()),
            trace_id=trace_id,
        )

        logger.info(
            "Pub/Sub message published successfully",
            message_id=message_id,
            trace_id=trace_id,
        )
    except Exception as e:
        logger.error("Failed to publish Pub/Sub message", error=str(e))


async def main() -> None:
    """Run all OpenTelemetry tests."""

    configure_otel("test_script")

    logger = get_logger(__name__)

    logger.info("=" * 60)
    logger.info("OpenTelemetry Integration Test")
    logger.info("=" * 60)

    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "Not set")
    cloud_trace_enabled = os.getenv("ENABLE_CLOUD_TRACE", "Not set")

    logger.info(
        "Environment check",
        google_cloud_project=project_id,
        enable_cloud_trace=cloud_trace_enabled,
    )

    logger.info("\nRunning basic tracing test...")
    await test_basic_tracing()

    logger.info("\nRunning Pub/Sub tracing test...")
    await test_pubsub_tracing()

    logger.info("")
    logger.info("=" * 60)
    logger.info("Test completed!")
    logger.info("=" * 60)

    await asyncio.sleep(2)


if __name__ == "__main__":
    asyncio.run(main())