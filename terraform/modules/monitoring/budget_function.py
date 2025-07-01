import base64
import json
import os
from typing import Any

import requests


def budget_alert_to_discord(request: Any) -> dict[str, Any]:
    """Forward GCP budget alerts to Discord webhook."""

    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    environment = os.environ.get("ENVIRONMENT", "unknown")

    if not webhook_url:
        return {"status": "error", "message": "Discord webhook URL not configured"}

    try:

        pubsub_message = request.data
        if isinstance(pubsub_message, str):
            pubsub_message = json.loads(pubsub_message)


        message_data = base64.b64decode(pubsub_message["message"]["data"]).decode("utf-8")
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
                {
                    "name": "Current Spend",
                    "value": f"{currency} {cost_amount:.2f}",
                    "inline": True
                },
                {
                    "name": "Budget Amount",
                    "value": f"{currency} {budget_amount:.2f}",
                    "inline": True
                },
                {
                    "name": "Percentage Used",
                    "value": f"{percentage:.1f}%",
                    "inline": True
                }
            ],
            "footer": {
                "text": f"GCP Project: {budget_notification.get('projectId', 'Unknown')}"
            },
            "timestamp": budget_notification.get("alertThresholdExceeded", {}).get("spendUpdateTime")
        }


        if "forecastedAmount" in budget_notification:
            forecasted = budget_notification["forecastedAmount"]
            forecast_percentage = (forecasted / budget_amount * 100) if budget_amount > 0 else 0
            embed["fields"].append({
                "name": "Forecasted Monthly Spend",
                "value": f"{currency} {forecasted:.2f} ({forecast_percentage:.1f}%)",
                "inline": False
            })


        response = requests.post(webhook_url, json={
            "content": f"@here Budget threshold exceeded for {environment}!" if percentage >= 90 else None,
            "embeds": [embed]
        }, timeout=30)

        if response.status_code == 204:
            return {"status": "success", "message": "Alert sent to Discord"}
        return {"status": "error", "message": f"Discord webhook failed: {response.status_code}"}

    except Exception as e:
        return {"status": "error", "message": str(e)}
