from datetime import datetime
from unittest.mock import AsyncMock, Mock, patch

from packages.shared_utils.src.discord import (
    create_scraper_report_embed,
    send_discord_webhook,
    send_scraper_report,
)


"""Test suite for Discord utility functions."""


def test_create_scraper_report_embed_required_fields() -> None:
    """Test that all required fields are present in the embed."""
    embed = create_scraper_report_embed(
        environment="test",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=100,
        new_files_downloaded=25,
        existing_files_skipped=75,
        total_processing_time_ms=60000,
        bucket_name="test-bucket",
    )

    assert "title" in embed
    assert "color" in embed
    assert "fields" in embed
    assert "timestamp" in embed
    assert "footer" in embed

    datetime.fromisoformat(embed["timestamp"].replace("Z", "+00:00"))

    assert embed["footer"]["text"] == "GrantFlow AI - NIH Grant Scraper"

    field_names = [field["name"] for field in embed["fields"]]
    assert "📊 Run Summary" in field_names
    assert "📁 Storage Info" in field_names
    assert "✅ Status" in field_names or "❌ Status" in field_names


def test_create_scraper_report_embed_with_optional_fields() -> None:
    """Test embed creation with all optional fields."""
    embed = create_scraper_report_embed(
        environment="staging",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=50,
        new_files_downloaded=10,
        existing_files_skipped=40,
        total_processing_time_ms=120000,
        bucket_name="grantflow-scraper",
        total_files_in_bucket=500,
        success=True,
        error_message=None,
    )

    storage_field = next(
        field for field in embed["fields"] if field["name"] == "📁 Storage Info"
    )
    assert "Total Files in Bucket**: 500 grants" in storage_field["value"]


def test_create_scraper_report_embed_large_numbers() -> None:
    """Test embed creation with large numbers (comma formatting)."""
    embed = create_scraper_report_embed(
        environment="prod",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=15000,
        new_files_downloaded=3500,
        existing_files_skipped=11500,
        total_processing_time_ms=600000,
        bucket_name="large-bucket",
        total_files_in_bucket=125000,
    )

    run_summary = next(
        field for field in embed["fields"] if field["name"] == "📊 Run Summary"
    )
    assert "Search Results Found**: 15,000 grants" in run_summary["value"]
    assert "New Files Downloaded**: 3,500 grants" in run_summary["value"]
    assert "Existing Files Skipped**: 11,500 grants" in run_summary["value"]
    assert "Total Processing Time**: 10m 0s" in run_summary["value"]

    storage_info = next(
        field for field in embed["fields"] if field["name"] == "📁 Storage Info"
    )
    assert "Total Files in Bucket**: 125,000 grants" in storage_info["value"]


@patch("packages.shared_utils.src.discord.httpx.AsyncClient")
async def test_send_discord_webhook_with_embed(mock_client_class: Mock) -> None:
    """Test sending Discord webhook with embed content."""
    mock_client = AsyncMock()
    mock_response = Mock()
    mock_response.status_code = 204
    mock_client.post.return_value = mock_response
    mock_client_class.return_value.__aenter__.return_value = mock_client

    test_embed = {
        "title": "Test Embed",
        "description": "Test Description",
        "color": 0x00FF00,
    }

    result = await send_discord_webhook(
        webhook_url="https://discord.com/api/webhooks/test",
        embed=test_embed,
        username="Test Bot",
    )

    assert result is True
    mock_client.post.assert_called_once()

    call_args = mock_client.post.call_args
    payload = call_args[1]["json"]
    assert payload["embeds"] == [test_embed]
    assert payload["username"] == "Test Bot"
    assert "content" not in payload


@patch("packages.shared_utils.src.discord.httpx.AsyncClient")
async def test_send_discord_webhook_with_content_and_embed(
    mock_client_class: Mock,
) -> None:
    """Test sending Discord webhook with both content and embed."""
    mock_client = AsyncMock()
    mock_response = Mock()
    mock_response.status_code = 204
    mock_client.post.return_value = mock_response
    mock_client_class.return_value.__aenter__.return_value = mock_client

    test_embed = {"title": "Test Embed"}

    result = await send_discord_webhook(
        webhook_url="https://discord.com/api/webhooks/test",
        content="Test content",
        embed=test_embed,
    )

    assert result is True

    call_args = mock_client.post.call_args
    payload = call_args[1]["json"]
    assert payload["content"] == "Test content"
    assert payload["embeds"] == [test_embed]


@patch("packages.shared_utils.src.discord.httpx.AsyncClient")
async def test_send_discord_webhook_http_error(mock_client_class: Mock) -> None:
    """Test Discord webhook with HTTP error response."""
    mock_client = AsyncMock()
    mock_response = Mock()
    mock_response.status_code = 429
    mock_response.text = "Rate limited"
    mock_client.post.return_value = mock_response
    mock_client_class.return_value.__aenter__.return_value = mock_client

    result = await send_discord_webhook(
        webhook_url="https://discord.com/api/webhooks/test",
        content="Test message",
    )

    assert result is False


@patch("packages.shared_utils.src.discord.httpx.AsyncClient")
async def test_send_discord_webhook_network_error(mock_client_class: Mock) -> None:
    """Test Discord webhook with network error."""
    mock_client = AsyncMock()
    mock_client.post.side_effect = Exception("Connection failed")
    mock_client_class.return_value.__aenter__.return_value = mock_client

    result = await send_discord_webhook(
        webhook_url="https://discord.com/api/webhooks/test",
        content="Test message",
    )

    assert result is False


@patch("packages.shared_utils.src.discord.send_discord_webhook")
async def test_send_scraper_report_success(mock_send_webhook: AsyncMock) -> None:
    """Test sending scraper report with success status."""
    mock_send_webhook.return_value = True

    result = await send_scraper_report(
        webhook_url="https://discord.com/api/webhooks/test",
        environment="staging",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=100,
        new_files_downloaded=25,
        existing_files_skipped=75,
        total_processing_time_ms=120000,
        bucket_name="test-bucket",
        total_files_in_bucket=500,
        success=True,
    )

    assert result is True
    mock_send_webhook.assert_called_once()

    call_args = mock_send_webhook.call_args
    assert call_args[0][0] == "https://discord.com/api/webhooks/test"
    assert "embed" in call_args[1]

    embed = call_args[1]["embed"]
    assert "🤖 NIH Grant Scraper Report - STAGING" in embed["title"]
    assert embed["color"] == 0x00FF00


@patch("packages.shared_utils.src.discord.send_discord_webhook")
async def test_send_scraper_report_failure(mock_send_webhook: AsyncMock) -> None:
    """Test sending scraper report with failure status."""
    mock_send_webhook.return_value = True

    result = await send_scraper_report(
        webhook_url="https://discord.com/api/webhooks/test",
        environment="prod",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=0,
        new_files_downloaded=0,
        existing_files_skipped=0,
        total_processing_time_ms=5000,
        bucket_name="test-bucket",
        success=False,
        error_message="Network timeout occurred",
    )

    assert result is True
    mock_send_webhook.assert_called_once()

    embed = mock_send_webhook.call_args[1]["embed"]
    assert "🚨 NIH Grant Scraper Report - PROD" in embed["title"]
    assert embed["color"] == 0xFF0000

    status_field = next(field for field in embed["fields"] if "Status" in field["name"])
    assert "Failed" in status_field["value"]
    assert "Network timeout occurred" in status_field["value"]


@patch("packages.shared_utils.src.discord.send_discord_webhook")
async def test_send_scraper_report_webhook_failure(
    mock_send_webhook: AsyncMock,
) -> None:
    """Test send_scraper_report when webhook sending fails."""
    mock_send_webhook.return_value = False

    result = await send_scraper_report(
        webhook_url="https://discord.com/api/webhooks/test",
        environment="staging",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=50,
        new_files_downloaded=10,
        existing_files_skipped=40,
        total_processing_time_ms=60000,
        bucket_name="test-bucket",
    )

    assert result is False
    mock_send_webhook.assert_called_once()


def test_create_scraper_report_embed_zero_values() -> None:
    """Test embed creation with zero values."""
    embed = create_scraper_report_embed(
        environment="test",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=0,
        new_files_downloaded=0,
        existing_files_skipped=0,
        total_processing_time_ms=100,
        bucket_name="empty-bucket",
        total_files_in_bucket=0,
    )

    run_summary = next(
        field for field in embed["fields"] if field["name"] == "📊 Run Summary"
    )
    assert "Search Results Found**: 0 grants" in run_summary["value"]
    assert "New Files Downloaded**: 0 grants" in run_summary["value"]
    assert "Existing Files Skipped**: 0 grants" in run_summary["value"]

    storage_info = next(
        field for field in embed["fields"] if field["name"] == "📁 Storage Info"
    )
    assert "Total Files in Bucket**: 0 grants" in storage_info["value"]


def test_create_scraper_report_embed_without_total_files() -> None:
    """Test embed creation without total files in bucket."""
    embed = create_scraper_report_embed(
        environment="test",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=10,
        new_files_downloaded=5,
        existing_files_skipped=5,
        total_processing_time_ms=30000,
        bucket_name="test-bucket",
        total_files_in_bucket=None,
    )

    storage_info = next(
        field for field in embed["fields"] if field["name"] == "📁 Storage Info"
    )

    assert "Bucket**: `test-bucket`" in storage_info["value"]
    assert "Total Files in Bucket" not in storage_info["value"]
