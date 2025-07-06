import base64
import json
import os
from datetime import UTC, datetime
from typing import Any

import requests


def app_hosting_alert_to_discord(request: Any) -> dict[str, Any]:
    """Forward GCP App Hosting alerts to Discord webhook."""

    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    environment = os.environ.get("ENVIRONMENT", "unknown")
    project_id = os.environ.get("PROJECT_ID", "unknown")

    if not webhook_url:
        return {"status": "error", "message": "Discord webhook URL not configured"}

    try:
        pubsub_message = request.data
        if isinstance(pubsub_message, str):
            pubsub_message = json.loads(pubsub_message)

        message_data = base64.b64decode(pubsub_message["message"]["data"]).decode("utf-8")
        alert_data = json.loads(message_data)

        incident = alert_data.get("incident", {})
        alert_policy = incident.get("policy_name", "Unknown Policy")
        condition_name = incident.get("condition_name", "Unknown Condition")
        state = incident.get("state", "UNKNOWN")
        summary = incident.get("summary", "No summary available")

        if "error" in alert_policy.lower() or "failure" in alert_policy.lower():
            color = 0xFF0000
            emoji = "🚨"
            priority = "HIGH"
        elif "memory" in alert_policy.lower() or "performance" in alert_policy.lower():
            color = 0xFF8C00
            emoji = "⚠️"
            priority = "MEDIUM"
        else:
            color = 0xFFD700
            emoji = "🔍"
            priority = "LOW"

        fields = [
            {"name": "🎯 Condition", "value": condition_name, "inline": True},
            {"name": "📊 State", "value": state, "inline": True},
            {"name": "⚡ Priority", "value": priority, "inline": True},
            {
                "name": "🔗 Quick Links",
                "value": f"• [App Hosting Console](https://console.firebase.google.com/project/{project_id}/apphosting/monorepo)\n• [Cloud Logs](https://console.cloud.google.com/logs/query?project={project_id})\n• [Monitoring](https://console.cloud.google.com/monitoring/alerting?project={project_id})",
                "inline": False,
            },
        ]

        embed = {
            "title": f"{emoji} **App Hosting Alert** - {environment.upper()}",
            "description": f"**{alert_policy}**\n{summary}",
            "color": color,
            "fields": fields,
            "footer": {"text": f"GCP Project: {project_id} | GrantFlow App Hosting Monitor"},
            "timestamp": datetime.now(UTC).isoformat(),
        }

        if "started_at" in incident:
            fields.append({"name": "🕐 Started At", "value": incident["started_at"], "inline": True})

        if "resource" in alert_data:
            resource = alert_data["resource"]
            if "labels" in resource:
                labels = resource["labels"]
                if "service_name" in labels:
                    fields.append({"name": "🔧 Service", "value": labels["service_name"], "inline": True})

        payload = {
            "content": f"@here **{priority} PRIORITY** App Hosting alert in {environment}!"
            if priority == "HIGH"
            else None,
            "embeds": [embed],
        }

        response = requests.post(webhook_url, json=payload, timeout=30)

        if response.status_code == 204:
            return {"status": "success", "message": "Alert sent to Discord"}
        return {"status": "error", "message": f"Discord webhook failed: {response.status_code} - {response.text}"}

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        return {"status": "error", "message": f"Data parsing error: {e!s}"}
    except requests.RequestException as e:
        return {"status": "error", "message": f"Discord webhook request failed: {e!s}"}
    except Exception as e:
        return {"status": "error", "message": f"Unexpected error: {e!s}"}


def create_test_alert_embed(environment: str, project_id: str) -> dict[str, Any]:
    """Create a test alert embed for monitoring verification."""
    return {
        "title": "🧪 **App Hosting Monitoring Test**",
        "description": "Test alert to verify App Hosting monitoring is properly configured",
        "color": 0x00FF00,
        "fields": [
            {"name": "🔧 Environment", "value": environment, "inline": True},
            {"name": "📅 Test Time", "value": datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC"), "inline": True},
            {"name": "✅ Status", "value": "Monitoring system operational", "inline": True},
            {
                "name": "🔗 Console Links",
                "value": f"• [App Hosting](https://console.firebase.google.com/project/{project_id}/apphosting/monorepo)\n• [Logs](https://console.cloud.google.com/logs/query?project={project_id})",
                "inline": False,
            },
        ],
        "footer": {"text": f"GrantFlow App Hosting Monitor - Project: {project_id}"},
        "timestamp": datetime.now(UTC).isoformat(),
    }


def send_test_alert(webhook_url: str, environment: str, project_id: str) -> bool:
    """Send a test alert to verify Discord integration."""
    embed = create_test_alert_embed(environment, project_id)

    payload = {"content": "🚀 **Monitoring Test** - App Hosting alerts are now active!", "embeds": [embed]}

    try:
        response = requests.post(webhook_url, json=payload, timeout=30)
        return bool(response.status_code == 204)
    except requests.RequestException:
        return False
