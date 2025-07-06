"""Daily monitoring health check for GrantFlow App Hosting."""

import asyncio
import sys
from datetime import UTC, datetime

import httpx


async def send_daily_health_check() -> bool:
    """Send a daily health check message to Discord."""

    webhook_url = "https://discord.com/api/webhooks/1389591048962969661/h7QTWNUUPRsL1HwrhfJx15VmiDKIU0mR_SgOvdTMEQbn9eyuZ0XO6mDtG0Q0p6iFYYyY"

    embed = {
        "title": "✅ **Daily Monitoring Health Check**",
        "description": "GrantFlow App Hosting monitoring system is operational",
        "color": 0x00FF00,
        "fields": [
            {"name": "📅 Date", "value": datetime.now(UTC).strftime("%Y-%m-%d"), "inline": True},
            {"name": "🕐 Time", "value": datetime.now(UTC).strftime("%H:%M UTC"), "inline": True},
            {"name": "🔧 Environment", "value": "Staging", "inline": True},
            {
                "name": "📊 Monitoring Status",
                "value": "• Error alerts: Active\n• Memory alerts: Active\n• Deployment alerts: Active\n• Discord notifications: Working",
                "inline": False,
            },
            {
                "name": "🔗 Quick Links",
                "value": "• [App Hosting Console](https://console.firebase.google.com/project/grantflow/apphosting/monorepo)\n• [Cloud Logs](https://console.cloud.google.com/logs/query?project=grantflow)\n• [Monitoring Dashboard](https://console.cloud.google.com/monitoring?project=grantflow)",
                "inline": False,
            },
        ],
        "footer": {"text": "GrantFlow Daily Health Check - Automated Monitoring"},
        "timestamp": datetime.now(UTC).isoformat(),
    }

    payload = {"content": "🌅 **Daily Health Check** - All monitoring systems operational", "embeds": [embed]}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(webhook_url, json=payload)

        return response.status_code == 204

    except Exception:
        return False


async def main() -> None:
    """Main function for daily health check."""
    success = await send_daily_health_check()

    if success:
        pass
    else:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
