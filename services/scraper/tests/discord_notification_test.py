from datetime import date
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

from litestar.testing import AsyncTestClient
from packages.shared_utils.src.discord import (
    create_scraper_report_embed,
    send_discord_webhook,
    send_scraper_report,
)
from services.scraper.src.main import run_scraper
from services.scraper.src.storage import SimpleFileStorage


def test_create_scraper_report_embed_success() -> None:
    """Test creating a successful scraper report embed."""
    embed = create_scraper_report_embed(
        environment="staging",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=100,
        new_files_downloaded=25,
        existing_files_skipped=75,
        total_processing_time_ms=120000,
        bucket_name="grantflow-scraper",
        total_files_in_bucket=500,
        success=True,
    )

    assert embed["title"] == "🤖 NIH Grant Scraper Report - STAGING"
    assert embed["color"] == 0x00FF00
    assert len(embed["fields"]) == 3

    run_summary = embed["fields"][0]
    assert run_summary["name"] == "📊 Run Summary"
    assert "Date Range**: 2025-07-01 to 2025-07-02" in run_summary["value"]
    assert "Search Results Found**: 100 grants" in run_summary["value"]
    assert "New Files Downloaded**: 25 grants" in run_summary["value"]
    assert "Existing Files Skipped**: 75 grants" in run_summary["value"]
    assert "Total Processing Time**: 2m 0s" in run_summary["value"]

    storage_info = embed["fields"][1]
    assert storage_info["name"] == "📁 Storage Info"
    assert "Bucket**: `grantflow-scraper`" in storage_info["value"]
    assert "Total Files in Bucket**: 500 grants" in storage_info["value"]

    status_field = embed["fields"][2]
    assert status_field["name"] == "✅ Status"
    assert status_field["value"] == "Completed Successfully"


def test_create_scraper_report_embed_failure() -> None:
    """Test creating a failed scraper report embed."""
    embed = create_scraper_report_embed(
        environment="prod",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=0,
        new_files_downloaded=0,
        existing_files_skipped=0,
        total_processing_time_ms=5000,
        bucket_name="grantflow-scraper",
        success=False,
        error_message="Network timeout",
    )

    assert embed["title"] == "🤖 NIH Grant Scraper Report - PROD"
    assert embed["color"] == 0xFF0000

    status_field = embed["fields"][2]
    assert status_field["name"] == "❌ Status"
    assert "Failed" in status_field["value"]
    assert "Error**: Network timeout" in status_field["value"]


def test_create_scraper_report_embed_time_formatting() -> None:
    """Test different time formatting scenarios."""

    embed = create_scraper_report_embed(
        environment="staging",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=10,
        new_files_downloaded=5,
        existing_files_skipped=5,
        total_processing_time_ms=500,
        bucket_name="test-bucket",
    )
    run_summary = embed["fields"][0]
    assert "Total Processing Time**: 500ms" in run_summary["value"]

    embed = create_scraper_report_embed(
        environment="staging",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=10,
        new_files_downloaded=5,
        existing_files_skipped=5,
        total_processing_time_ms=15500,
        bucket_name="test-bucket",
    )
    run_summary = embed["fields"][0]
    assert "Total Processing Time**: 15.5s" in run_summary["value"]

    embed = create_scraper_report_embed(
        environment="staging",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=10,
        new_files_downloaded=5,
        existing_files_skipped=5,
        total_processing_time_ms=125000,
        bucket_name="test-bucket",
    )
    run_summary = embed["fields"][0]
    assert "Total Processing Time**: 2m 5s" in run_summary["value"]


@patch("packages.shared_utils.src.discord.httpx.AsyncClient")
async def test_send_discord_webhook_success(mock_client_class: Mock) -> None:
    """Test successful Discord webhook sending."""
    mock_client = AsyncMock()
    mock_response = Mock()
    mock_response.status_code = 204
    mock_client.post.return_value = mock_response
    mock_client_class.return_value.__aenter__.return_value = mock_client

    result = await send_discord_webhook(
        webhook_url="https://discord.com/api/webhooks/test",
        content="Test message",
    )

    assert result is True
    mock_client.post.assert_called_once()
    call_args = mock_client.post.call_args
    assert call_args[0][0] == "https://discord.com/api/webhooks/test"
    assert call_args[1]["json"]["content"] == "Test message"


@patch("packages.shared_utils.src.discord.httpx.AsyncClient")
async def test_send_discord_webhook_failure(mock_client_class: Mock) -> None:
    """Test Discord webhook sending failure."""
    mock_client = AsyncMock()
    mock_response = Mock()
    mock_response.status_code = 400
    mock_response.text = "Bad Request"
    mock_client.post.return_value = mock_response
    mock_client_class.return_value.__aenter__.return_value = mock_client

    result = await send_discord_webhook(
        webhook_url="https://discord.com/api/webhooks/test",
        content="Test message",
    )

    assert result is False


@patch("packages.shared_utils.src.discord.httpx.AsyncClient")
async def test_send_discord_webhook_exception(mock_client_class: Mock) -> None:
    """Test Discord webhook sending with exception."""
    mock_client = AsyncMock()
    mock_client.post.side_effect = Exception("Network error")
    mock_client_class.return_value.__aenter__.return_value = mock_client

    result = await send_discord_webhook(
        webhook_url="https://discord.com/api/webhooks/test",
        content="Test message",
    )

    assert result is False


async def test_send_discord_webhook_empty_url() -> None:
    """Test Discord webhook with empty URL."""
    result = await send_discord_webhook(
        webhook_url="",
        content="Test message",
    )

    assert result is False


@patch("packages.shared_utils.src.discord.send_discord_webhook")
async def test_send_scraper_report(mock_send_webhook: AsyncMock) -> None:
    """Test sending a complete scraper report."""
    mock_send_webhook.return_value = True

    result = await send_scraper_report(
        webhook_url="https://discord.com/api/webhooks/test",
        environment="staging",
        date_range="2025-07-01 to 2025-07-02",
        search_results_found=50,
        new_files_downloaded=10,
        existing_files_skipped=40,
        total_processing_time_ms=60000,
        bucket_name="test-bucket",
        total_files_in_bucket=200,
        success=True,
    )

    assert result is True
    mock_send_webhook.assert_called_once()
    call_args = mock_send_webhook.call_args
    assert call_args[0][0] == "https://discord.com/api/webhooks/test"
    assert "embed" in call_args[1]


@patch("services.scraper.src.main.send_scraper_report")
@patch("services.scraper.src.main.download_search_data")
@patch("services.scraper.src.main.download_grant_pages")
async def test_run_scraper_with_metrics(
    mock_download_grant_pages: AsyncMock,
    mock_download_search_data: AsyncMock,
    mock_send_report: AsyncMock,
) -> None:
    """Test run_scraper returns correct metrics."""

    mock_search_results = [
        {"url": "https://example.com/grant1"},
        {"url": "https://example.com/grant2"},
        {"url": "https://example.com/grant3"},
    ]
    mock_download_search_data.return_value = mock_search_results
    mock_download_grant_pages.return_value = 2

    storage = SimpleFileStorage()

    with patch.object(storage, "get_existing_file_identifiers", return_value={"existing1"}):
        metrics = await run_scraper(
            storage=storage,
            from_date=date(2025, 7, 1),
            to_date=date(2025, 7, 2),
        )

    assert metrics["search_results_count"] == 3
    assert metrics["new_files_downloaded"] == 2
    assert metrics["existing_files_skipped"] == 1
    assert metrics["existing_files_count"] == 1
    assert "total_duration_ms" in metrics
    assert isinstance(metrics["total_duration_ms"], float)


@patch("services.scraper.src.main.send_scraper_report")
@patch("services.scraper.src.main.run_scraper")
@patch("services.scraper.src.main.get_env")
async def test_handle_scraper_request_success_with_discord(
    mock_get_env: Mock,
    mock_run_scraper: AsyncMock,
    mock_send_report: AsyncMock,
    test_client: AsyncTestClient[Any],
) -> None:
    """Test successful scraper request sends Discord notification."""

    mock_get_env.side_effect = lambda key, raise_on_missing=True, fallback="": {
        "DISCORD_WEBHOOK_URL": "https://discord.com/api/webhooks/test",
        "ENVIRONMENT": "staging",
        "STORAGE_EMULATOR_HOST": "localhost:8080",
        "DEBUG": "True",
    }.get(key, fallback)

    mock_metrics = {
        "search_results_count": 25,
        "new_files_downloaded": 10,
        "existing_files_skipped": 15,
        "existing_files_count": 100,
        "total_duration_ms": 45000.0,
    }
    mock_run_scraper.return_value = mock_metrics
    mock_send_report.return_value = True

    response = await test_client.post("/")

    assert response.status_code == 201
    response_data = response.json()
    assert response_data["status"] == "success"
    assert response_data["message"] == "Scraper completed successfully"

    mock_send_report.assert_called_once()
    call_kwargs = mock_send_report.call_args[1]
    assert call_kwargs["webhook_url"] == "https://discord.com/api/webhooks/test"
    assert call_kwargs["environment"] == "staging"
    assert call_kwargs["search_results_found"] == 25
    assert call_kwargs["new_files_downloaded"] == 10
    assert call_kwargs["existing_files_skipped"] == 15
    assert call_kwargs["total_processing_time_ms"] == 45000.0
    assert call_kwargs["bucket_name"] == "local-storage"
    assert call_kwargs["success"] is True


@patch("services.scraper.src.main.send_scraper_report")
@patch("services.scraper.src.main.run_scraper")
@patch("services.scraper.src.main.get_env")
async def test_handle_scraper_request_failure_with_discord(
    mock_get_env: Mock,
    mock_run_scraper: AsyncMock,
    mock_send_report: AsyncMock,
    test_client: AsyncTestClient[Any],
) -> None:
    """Test failed scraper request sends Discord failure notification."""

    mock_get_env.side_effect = lambda key, raise_on_missing=True, fallback="": {
        "DISCORD_WEBHOOK_URL": "https://discord.com/api/webhooks/test",
        "ENVIRONMENT": "staging",
        "STORAGE_EMULATOR_HOST": "localhost:8080",
        "DEBUG": "True",
    }.get(key, fallback)

    mock_run_scraper.side_effect = Exception("Test error")
    mock_send_report.return_value = True

    response = await test_client.post("/")

    assert response.status_code == 500

    mock_send_report.assert_called_once()
    call_kwargs = mock_send_report.call_args[1]
    assert call_kwargs["webhook_url"] == "https://discord.com/api/webhooks/test"
    assert call_kwargs["environment"] == "staging"
    assert call_kwargs["search_results_found"] == 0
    assert call_kwargs["new_files_downloaded"] == 0
    assert call_kwargs["existing_files_skipped"] == 0
    assert call_kwargs["success"] is False
    assert call_kwargs["error_message"] == "Test error"


@patch("services.scraper.src.main.send_scraper_report")
@patch("services.scraper.src.main.run_scraper")
@patch("services.scraper.src.main.get_env")
async def test_handle_scraper_request_no_discord_url(
    mock_get_env: Mock,
    mock_run_scraper: AsyncMock,
    mock_send_report: AsyncMock,
    test_client: AsyncTestClient[Any],
) -> None:
    """Test scraper request without Discord URL configured."""

    mock_get_env.side_effect = lambda key, raise_on_missing=True, fallback="": {
        "DISCORD_WEBHOOK_URL": "",
        "ENVIRONMENT": "staging",
        "STORAGE_EMULATOR_HOST": "localhost:8080",
        "DEBUG": "True",
    }.get(key, fallback)

    mock_metrics = {
        "search_results_count": 10,
        "new_files_downloaded": 5,
        "existing_files_skipped": 5,
        "existing_files_count": 50,
        "total_duration_ms": 30000.0,
    }
    mock_run_scraper.return_value = mock_metrics

    response = await test_client.post("/")

    assert response.status_code == 201
    response_data = response.json()
    assert response_data["status"] == "success"
    assert response_data["message"] == "Scraper completed successfully"

    mock_send_report.assert_not_called()


@patch("services.scraper.src.main.send_scraper_report")
@patch("services.scraper.src.main.run_scraper")
@patch("services.scraper.src.main.get_env")
async def test_handle_scraper_request_discord_send_fails(
    mock_get_env: Mock,
    mock_run_scraper: AsyncMock,
    mock_send_report: AsyncMock,
    test_client: AsyncTestClient[Any],
) -> None:
    """Test scraper request when Discord notification fails."""

    mock_get_env.side_effect = lambda key, raise_on_missing=True, fallback="": {
        "DISCORD_WEBHOOK_URL": "https://discord.com/api/webhooks/test",
        "ENVIRONMENT": "staging",
        "STORAGE_EMULATOR_HOST": "localhost:8080",
        "DEBUG": "True",
    }.get(key, fallback)

    mock_metrics = {
        "search_results_count": 10,
        "new_files_downloaded": 5,
        "existing_files_skipped": 5,
        "existing_files_count": 50,
        "total_duration_ms": 30000.0,
    }
    mock_run_scraper.return_value = mock_metrics
    mock_send_report.side_effect = Exception("Discord API error")

    response = await test_client.post("/")

    assert response.status_code == 201
    response_data = response.json()
    assert response_data["status"] == "success"
    assert response_data["message"] == "Scraper completed successfully"

    mock_send_report.assert_called_once()
