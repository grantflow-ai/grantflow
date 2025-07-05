"""Test Discord webhook to verify monitoring is working."""

import asyncio
from datetime import UTC, datetime

import httpx


async def test_discord_webhook() -> bool | None:
    """Test the Discord webhook with a sample alert."""

    webhook_url = "https://discord.com/api/webhooks/1389591048962969661/h7QTWNUUPRsL1HwrhfJx15VmiDKIU0mR_SgOvdTMEQbn9eyuZ0XO6mDtG0Q0p6iFYYyY"

    embed = {
        "title": "🧪 **Discord Monitoring Test - GrantFlow**",
        "description": "Testing Discord webhook integration for error monitoring setup",
        "color": 0x00FF00,
        "fields": [
            {"name": "🔧 Test Type", "value": "Manual webhook verification", "inline": True},
            {"name": "📅 Timestamp", "value": datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC"), "inline": True},
            {
                "name": "🎯 Purpose",
                "value": "Verifying Discord integration before setting up App Hosting error monitoring",
                "inline": False,
            },
        ],
        "footer": {"text": "GrantFlow AI - Monitoring Setup Test"},
        "timestamp": datetime.now(UTC).isoformat(),
    }

    payload = {
        "content": "🚀 **Monitoring System Test** - If you see this, Discord notifications are working!",
        "embeds": [embed],
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(webhook_url, json=payload)

        return response.status_code == 204

    except Exception:  # noqa: BLE001
        return False


if __name__ == "__main__":
    asyncio.run(test_discord_webhook())
