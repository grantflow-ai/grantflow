import asyncio
import base64
import json
import os
from datetime import UTC, datetime
from typing import Any

import functions_framework
import httpx
from cloudevents.http import CloudEvent

logger = __import__("logging").getLogger(__name__)


def get_mention_for_alert(alert_policy: str, priority: str) -> str:
    """Get Discord role mention based on alert type and priority."""

    if priority != "HIGH":
        return ""

    discord_role_alerts = os.environ.get("DISCORD_ROLE_ALERTS")
    if not discord_role_alerts:
        return ""

    critical_keywords = [
        "build_failure",
        "deployment_failure",
        "build failures",
        "deployment failures",
        "service_down",
        "service completely down",
        "database disconnected",
        "memory_critical",
        "high memory",
        "outage",
    ]

    policy_lower = alert_policy.lower()
    if any(keyword in policy_lower for keyword in critical_keywords):
        return f"<@&{discord_role_alerts}>"

    return ""


async def app_hosting_alert_to_discord(cloud_event: CloudEvent) -> dict[str, Any]:
    """Forward GCP App Hosting alerts to Discord webhook."""

    webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
    environment = os.environ.get("ENVIRONMENT", "unknown")
    project_id = os.environ.get("PROJECT_ID", "unknown")

    if not webhook_url:
        return {"status": "error", "message": "Discord webhook URL not configured"}

    try:

        logger.info("Received CloudEvent data type: %s", type(cloud_event.data).__name__)
        logger.info("CloudEvent data content: %s", str(cloud_event.data)[:500])


        if isinstance(cloud_event.data, dict) and "message" in cloud_event.data:

            pubsub_message = cloud_event.data["message"]
            if "data" in pubsub_message:

                message_data = base64.b64decode(pubsub_message["data"]).decode("utf-8")
            else:

                message_data = json.dumps(pubsub_message)
        elif isinstance(cloud_event.data, str):

            message_data = base64.b64decode(cloud_event.data).decode("utf-8")
        elif isinstance(cloud_event.data, dict):

            message_data = json.dumps(cloud_event.data)
        else:
            message_data = str(cloud_event.data)

        logger.info("Parsed message data: %s", message_data[:500])
        alert_data = json.loads(message_data)


        logger.info("Complete alert data structure: %s", json.dumps(alert_data, indent=2)[:2000])


        incident = None
        alert_policy = "Unknown Policy"
        condition_name = "Unknown Condition"
        state = "UNKNOWN"
        summary = "No summary available"

        if "incident" in alert_data:

            incident = alert_data.get("incident", {})
            alert_policy = incident.get("policy_name", "Unknown Policy")
            condition_name = incident.get("condition_name", "Unknown Condition")
            state = incident.get("state", "UNKNOWN")
            summary = incident.get("summary", "No summary available")
            logger.info("Using incident-based format")
        elif "policy" in alert_data:

            policy = alert_data.get("policy", {})
            alert_policy = policy.get("displayName") or policy.get("display_name") or policy.get("name", "Unknown Policy")
            condition_name = alert_data.get("condition", {}).get("displayName", "Unknown Condition")
            state = alert_data.get("state", "UNKNOWN")
            summary = alert_data.get("summary", "No summary available")
            logger.info("Using policy-based format")
        elif "policyName" in alert_data:

            alert_policy = alert_data.get("policyName", "Unknown Policy")
            condition_name = alert_data.get("conditionName", "Unknown Condition")
            state = alert_data.get("state", "UNKNOWN")
            summary = alert_data.get("summary", "No summary available")
            logger.info("Using direct fields format")
        else:

            logger.warning("Unknown alert format. Top-level keys: %s", list(alert_data.keys()))

            for policy_field in ["alertPolicy", "alert_policy", "policyDisplayName", "policy_display_name"]:
                if policy_field in alert_data:
                    policy_obj = alert_data[policy_field]
                    if isinstance(policy_obj, dict):
                        alert_policy = policy_obj.get("displayName") or policy_obj.get("display_name") or policy_obj.get("name", "Unknown Policy")
                    else:
                        alert_policy = str(policy_obj)
                    break


        alert_policy_lower = (alert_policy or "").lower()
        if "error" in alert_policy_lower or "failure" in alert_policy_lower:
            color = 0xFF0000
            emoji = "🚨"
            priority = "HIGH"
        elif "memory" in alert_policy_lower or "performance" in alert_policy_lower:
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

        if incident and "started_at" in incident:
            fields.append({"name": "🕐 Started At", "value": incident["started_at"], "inline": True})

        if "resource" in alert_data:
            resource = alert_data["resource"]
            if "labels" in resource:
                labels = resource["labels"]
                if "service_name" in labels:
                    fields.append({"name": "🔧 Service", "value": labels["service_name"], "inline": True})

        mention = get_mention_for_alert(alert_policy, priority)

        content = None
        if priority == "HIGH":
            if mention:
                content = f"{mention} **CRITICAL** App Hosting alert in {environment}!"
            else:
                content = f"🚨 **CRITICAL** App Hosting alert in {environment}!"

        payload = {
            "content": content,
            "embeds": [embed],
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=payload, timeout=30.0)

        if response.status_code == 204:
            return {"status": "success", "message": "Alert sent to Discord"}
        return {"status": "error", "message": f"Discord webhook failed: {response.status_code} - {response.text}"}

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        return {"status": "error", "message": f"Data parsing error: {e!s}"}
    except httpx.RequestError as e:
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


async def send_test_alert(webhook_url: str, environment: str, project_id: str) -> bool:
    """Send a test alert to verify Discord integration."""
    embed = create_test_alert_embed(environment, project_id)

    payload = {"content": "🚀 **Monitoring Test** - App Hosting alerts are now active!", "embeds": [embed]}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=payload, timeout=30.0)
        return bool(response.status_code == 204)
    except httpx.RequestError:
        return False


@functions_framework.cloud_event
def app_hosting_alert_to_discord_sync(cloud_event: CloudEvent) -> None:
    """Cloud Functions entry point for app hosting alerts."""
    result = asyncio.run(app_hosting_alert_to_discord(cloud_event))

    if result["status"] == "error":
        logger.error("Alert function error: %s", result["message"])
    else:
        logger.info("Alert sent successfully: %s", result["message"])
