from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any

import httpx
from packages.shared_utils.src.logger import get_logger

logger = get_logger(__name__)


async def send_discord_webhook(
    webhook_url: str,
    content: str | None = None,
    embed: dict[str, Any] | None = None,
    username: str | None = None,
) -> bool:
    """Send a message to Discord via webhook.
    
    Args:
        webhook_url: Discord webhook URL
        content: Simple text content (optional)
        embed: Rich embed content (optional)
        username: Override webhook username (optional)
        
    Returns:
        True if message was sent successfully, False otherwise
    """
    if not webhook_url:
        logger.warning("Discord webhook URL not provided")
        return False
        
    payload: dict[str, Any] = {}
    
    if content:
        payload["content"] = content
        
    if embed:
        payload["embeds"] = [embed]
        
    if username:
        payload["username"] = username
        
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(webhook_url, json=payload)
            
        if response.status_code == 204:
            logger.info("Discord webhook sent successfully")
            return True
        else:
            logger.error("Discord webhook failed", status_code=response.status_code, response_text=response.text)
            return False
            
    except Exception:
        logger.exception("Failed to send Discord webhook")
        return False


def create_scraper_report_embed(
    *,
    environment: str,
    date_range: str,
    search_results_found: int,
    new_files_downloaded: int,
    existing_files_skipped: int,
    total_processing_time_ms: float,
    bucket_name: str,
    total_files_in_bucket: int | None = None,
    success: bool = True,
    error_message: str | None = None,
) -> dict[str, Any]:
    """Create a Discord embed for scraper run report.
    
    Args:
        environment: Environment name (staging, prod)
        date_range: Date range that was scraped
        search_results_found: Total search results found
        new_files_downloaded: Number of new files downloaded
        existing_files_skipped: Number of existing files skipped
        total_processing_time_ms: Total processing time in milliseconds
        bucket_name: GCS bucket name
        total_files_in_bucket: Total files in bucket (optional)
        success: Whether the run was successful
        error_message: Error message if failed (optional)
        
    Returns:
        Discord embed dictionary
    """
    # Format processing time nicely
    if total_processing_time_ms < 1000:
        time_str = f"{total_processing_time_ms:.0f}ms"
    elif total_processing_time_ms < 60000:
        time_str = f"{total_processing_time_ms / 1000:.1f}s"
    else:
        minutes = int(total_processing_time_ms // 60000)
        seconds = int((total_processing_time_ms % 60000) // 1000)
        time_str = f"{minutes}m {seconds}s"
    
    # Choose emoji and color based on success
    if success:
        emoji = "🤖"
        status_emoji = "✅"
        status_text = "Completed Successfully"
        color = 0x00FF00  # Green
    else:
        emoji = "🚨"
        status_emoji = "❌"
        status_text = "Failed"
        color = 0xFF0000  # Red
    
    embed = {
        "title": f"{emoji} NIH Grant Scraper Report - {environment.upper()}",
        "color": color,
        "fields": [
            {
                "name": "📊 Run Summary",
                "value": (
                    f"• **Date Range**: {date_range}\n"
                    f"• **Search Results Found**: {search_results_found:,} grants\n"
                    f"• **New Files Downloaded**: {new_files_downloaded:,} grants\n"
                    f"• **Existing Files Skipped**: {existing_files_skipped:,} grants\n"
                    f"• **Total Processing Time**: {time_str}"
                ),
                "inline": False
            },
            {
                "name": "📁 Storage Info",
                "value": (
                    f"• **Bucket**: `{bucket_name}`\n"
                    + (f"• **Total Files in Bucket**: {total_files_in_bucket:,} grants\n" if total_files_in_bucket is not None else "")
                ),
                "inline": False
            },
            {
                "name": f"{status_emoji} Status",
                "value": status_text + (f"\n• **Error**: {error_message}" if error_message else ""),
                "inline": False
            }
        ],
        "timestamp": datetime.utcnow().isoformat(),
        "footer": {
            "text": "GrantFlow AI - NIH Grant Scraper"
        }
    }
    
    return embed


async def send_scraper_report(
    webhook_url: str,
    *,
    environment: str,
    date_range: str,
    search_results_found: int,
    new_files_downloaded: int,
    existing_files_skipped: int,
    total_processing_time_ms: float,
    bucket_name: str,
    total_files_in_bucket: int | None = None,
    success: bool = True,
    error_message: str | None = None,
) -> bool:
    """Send a scraper run report to Discord.
    
    Args:
        webhook_url: Discord webhook URL
        environment: Environment name (staging, prod)
        date_range: Date range that was scraped
        search_results_found: Total search results found
        new_files_downloaded: Number of new files downloaded
        existing_files_skipped: Number of existing files skipped
        total_processing_time_ms: Total processing time in milliseconds
        bucket_name: GCS bucket name
        total_files_in_bucket: Total files in bucket (optional)
        success: Whether the run was successful
        error_message: Error message if failed (optional)
        
    Returns:
        True if message was sent successfully, False otherwise
    """
    embed = create_scraper_report_embed(
        environment=environment,
        date_range=date_range,
        search_results_found=search_results_found,
        new_files_downloaded=new_files_downloaded,
        existing_files_skipped=existing_files_skipped,
        total_processing_time_ms=total_processing_time_ms,
        bucket_name=bucket_name,
        total_files_in_bucket=total_files_in_bucket,
        success=success,
        error_message=error_message,
    )
    
    return await send_discord_webhook(webhook_url, embed=embed)