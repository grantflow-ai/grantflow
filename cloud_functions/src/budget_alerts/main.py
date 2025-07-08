import asyncio
import base64
import json
import os
from typing import Any

import functions_framework
import httpx
from cloudevents.http import CloudEvent

logger = __import__("logging").getLogger(__name__)


async def budget_alert_to_discord(cloud_event: CloudEvent) -> dict[str, Any]:
    """Forward GCP budget alerts to Discord webhook."""

    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    environment = os.environ.get("ENVIRONMENT", "unknown")

    if not webhook_url:
        return {"status": "error", "message": "Discord webhook URL not configured"}

    try:
        if isinstance(cloud_event.data, dict):
            if "message" in cloud_event.data and "data" in cloud_event.data["message"]:
                message_data = base64.b64decode(cloud_event.data["message"]["data"]).decode("utf-8")
            else:
                message_data = json.dumps(cloud_event.data)
        elif isinstance(cloud_event.data, str):
            message_data = base64.b64decode(cloud_event.data).decode("utf-8")
        else:
            message_data = str(cloud_event.data)

        budget_notification = json.loads(message_data)

        budget_name = budget_notification.get("budgetDisplayName", "Unknown Budget")
        cost_amount = budget_notification.get("costAmount", 0)
        budget_amount = budget_notification.get("budgetAmount", 0)
        currency = budget_notification.get("currencyCode", "USD")

        percentage = (cost_amount / budget_amount * 100) if budget_amount > 0 else 0

        if percentage >= 100:
            color = 0xFF0000
            alert_emoji = "🚨"
        elif percentage >= 90:
            color = 0xFF8C00
            alert_emoji = "⚠️"
        elif percentage >= 75:
            color = 0xFFA500
            alert_emoji = "⚠️"
        else:
            color = 0xFFD700
            alert_emoji = "💰"

        embed = {
            "title": f"{alert_emoji} Budget Alert - {environment.upper()}",
            "description": f"**{budget_name}** has reached {percentage:.1f}% of the monthly budget",
            "color": color,
            "fields": [
                {"name": "Current Spend", "value": f"{currency} {cost_amount:.2f}", "inline": True},
                {"name": "Budget Amount", "value": f"{currency} {budget_amount:.2f}", "inline": True},
                {"name": "Percentage Used", "value": f"{percentage:.1f}%", "inline": True},
            ],
            "footer": {"text": f"GCP Project: {budget_notification.get('projectId', 'Unknown')}"},
            "timestamp": budget_notification.get("alertThresholdExceeded", {}).get("spendUpdateTime"),
        }

        if "forecastedAmount" in budget_notification:
            forecasted = budget_notification["forecastedAmount"]
            forecast_percentage = (forecasted / budget_amount * 100) if budget_amount > 0 else 0
            embed["fields"].append(
                {
                    "name": "Forecasted Monthly Spend",
                    "value": f"{currency} {forecasted:.2f} ({forecast_percentage:.1f}%)",
                    "inline": False,
                }
            )

        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook_url,
                json={
                    "content": f"@here Budget threshold exceeded for {environment}!" if percentage >= 90 else None,
                    "embeds": [embed],
                },
                timeout=30.0,
            )

        if response.status_code == 204:
            return {"status": "success", "message": "Alert sent to Discord"}
        return {"status": "error", "message": f"Discord webhook failed: {response.status_code}"}

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        return {"status": "error", "message": f"Data parsing error: {e!s}"}
    except httpx.RequestError as e:
        return {"status": "error", "message": f"Discord webhook request failed: {e!s}"}
    except Exception as e:
        return {"status": "error", "message": f"Unexpected error: {e!s}"}


@functions_framework.cloud_event
def budget_alert_to_discord_sync(cloud_event: CloudEvent) -> None:
    """Cloud Functions entry point for budget alerts."""
    result = asyncio.run(budget_alert_to_discord(cloud_event))

    if result["status"] == "error":
        logger.error("Budget alert function error: %s", result["message"])
    else:
        logger.info("Budget alert sent successfully: %s", result["message"])
