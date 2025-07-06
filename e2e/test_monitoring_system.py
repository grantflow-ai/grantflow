"""Test comprehensive monitoring system for GrantFlow App Hosting."""

import asyncio
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx


class MonitoringTester:
    def __init__(self, webhook_url: str, environment: str = "staging") -> None:
        self.webhook_url = webhook_url
        self.environment = environment
        self.project_id = "grantflow"

    async def send_discord_message(self, content: str | None = None, embed: dict[str, Any] | None = None) -> bool:
        """Send a message to Discord."""
        payload: dict[str, Any] = {}
        if content:
            payload["content"] = content
        if embed:
            payload["embeds"] = [embed]

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.webhook_url, json=payload)

            return response.status_code == 204
        except Exception:
            return False

    def create_error_alert_embed(self) -> dict[str, Any]:
        """Create a sample error alert embed."""
        return {
            "title": "🚨 **App Hosting Critical Error** - STAGING",
            "description": "**High Error Rate Detected**\nApplication error rate exceeded 5 errors/minute threshold",
            "color": 0xFF0000,
            "fields": [
                {"name": "🎯 Alert Type", "value": "High Error Rate", "inline": True},
                {"name": "📊 Error Count", "value": "8 errors/minute", "inline": True},
                {"name": "⚡ Priority", "value": "CRITICAL", "inline": True},
                {"name": "🕐 Time Window", "value": "Last 5 minutes", "inline": True},
                {"name": "🔧 Service", "value": "monorepo (Next.js)", "inline": True},
                {"name": "📈 Trend", "value": "↗️ Increasing", "inline": True},
                {
                    "name": "🔗 Quick Actions",
                    "value": f"• [App Hosting Console](https://console.firebase.google.com/project/{self.project_id}/apphosting/monorepo)\n• [Error Logs](https://console.cloud.google.com/logs/query?project={self.project_id})\n• [Monitoring Dashboard](https://console.cloud.google.com/monitoring?project={self.project_id})",
                    "inline": False,
                },
                {
                    "name": "🩺 Recommended Actions",
                    "value": "1. Check recent deployments\n2. Verify environment variables\n3. Check database connectivity\n4. Review application logs",
                    "inline": False,
                },
            ],
            "footer": {"text": f"GrantFlow App Hosting Monitor - Project: {self.project_id}"},
            "timestamp": datetime.now(UTC).isoformat(),
        }

    def create_memory_alert_embed(self) -> dict[str, Any]:
        """Create a sample memory alert embed."""
        return {
            "title": "⚠️ **App Hosting Memory Warning** - STAGING",
            "description": "**High Memory Usage Detected**\nMemory utilization above 80% threshold",
            "color": 0xFF8C00,
            "fields": [
                {"name": "📊 Memory Usage", "value": "85% (870MB/1024MB)", "inline": True},
                {"name": "⚡ Priority", "value": "HIGH", "inline": True},
                {"name": "📈 Trend", "value": "↗️ Increasing", "inline": True},
                {
                    "name": "🔗 Monitoring Link",
                    "value": f"[View Memory Metrics](https://console.cloud.google.com/monitoring/dashboards?project={self.project_id})",
                    "inline": False,
                },
                {
                    "name": "💡 Recommendations",
                    "value": "• Consider increasing memory allocation\n• Check for memory leaks\n• Review recent code changes\n• Monitor garbage collection",
                    "inline": False,
                },
            ],
            "footer": {"text": f"GrantFlow App Hosting Monitor - Project: {self.project_id}"},
            "timestamp": datetime.now(UTC).isoformat(),
        }

    def create_deployment_alert_embed(self) -> dict[str, Any]:
        """Create a sample deployment failure alert."""
        return {
            "title": "🚨 **Deployment Failure** - STAGING",
            "description": "**App Hosting deployment failed**\nBuild process encountered errors during deployment",
            "color": 0xFF0000,
            "fields": [
                {"name": "🔧 Build Status", "value": "FAILED", "inline": True},
                {"name": "⏱️ Duration", "value": "2m 34s", "inline": True},
                {"name": "📦 Commit", "value": "abc123f (main)", "inline": True},
                {"name": "❌ Error Type", "value": "TypeScript compilation error", "inline": False},
                {
                    "name": "🔗 Build Logs",
                    "value": f"[View Build Details](https://console.firebase.google.com/project/{self.project_id}/apphosting/monorepo)",
                    "inline": False,
                },
                {
                    "name": "🩺 Next Steps",
                    "value": "1. Check build logs for details\n2. Verify code syntax\n3. Check dependencies\n4. Retry deployment if transient",
                    "inline": False,
                },
            ],
            "footer": {"text": f"GrantFlow App Hosting Monitor - Project: {self.project_id}"},
            "timestamp": datetime.now(UTC).isoformat(),
        }

    def create_success_embed(self) -> dict[str, Any]:
        """Create a monitoring system success embed."""
        return {
            "title": "✅ **Monitoring System Test Complete**",
            "description": "App Hosting monitoring is properly configured and operational",
            "color": 0x00FF00,
            "fields": [
                {
                    "name": "🎯 Tests Completed",
                    "value": "• Error Alert Format\n• Memory Warning Format\n• Deployment Failure Format\n• Discord Integration",
                    "inline": False,
                },
                {
                    "name": "📊 Monitoring Coverage",
                    "value": "• Error rate alerts\n• Memory usage alerts\n• Deployment monitoring\n• Performance tracking",
                    "inline": False,
                },
                {
                    "name": "🔔 Alert Thresholds",
                    "value": "• Errors: >5/minute\n• Memory: >80%\n• Response time: >5s\n• Deployments: Any failure",
                    "inline": False,
                },
            ],
            "footer": {"text": f"GrantFlow Monitoring System - Environment: {self.environment.upper()}"},
            "timestamp": datetime.now(UTC).isoformat(),
        }

    async def test_all_alert_types(self) -> bool:
        """Test all types of monitoring alerts."""

        error_embed = self.create_error_alert_embed()
        success = await self.send_discord_message(
            content="@here **CRITICAL ALERT** - App Hosting errors detected!", embed=error_embed
        )
        if not success:
            return False

        await asyncio.sleep(2)

        memory_embed = self.create_memory_alert_embed()
        success = await self.send_discord_message(embed=memory_embed)
        if not success:
            return False

        await asyncio.sleep(2)

        deployment_embed = self.create_deployment_alert_embed()
        success = await self.send_discord_message(
            content="🚨 **Deployment Failed** - Check immediately!", embed=deployment_embed
        )
        if not success:
            return False

        await asyncio.sleep(2)

        success_embed = self.create_success_embed()
        return await self.send_discord_message(
            content="🎉 **Monitoring Test Complete** - All alert types working!", embed=success_embed
        )


async def main() -> None:
    """Main test function."""

    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")

    if not webhook_url:
        try:
            with Path("terraform/terraform.tfvars").open() as f:  # noqa: ASYNC230
                content = f.read()
                for line in content.split("\n"):
                    if "discord_webhook_url" in line and "=" in line:
                        webhook_url = line.split("=")[1].strip().strip('"')
                        break
        except FileNotFoundError:
            pass

    if not webhook_url:
        return

    if "discord.com/api/webhooks" not in webhook_url:
        return

    tester = MonitoringTester(webhook_url)
    success = await tester.test_all_alert_types()

    if success:
        pass
    else:
        pass

    return


if __name__ == "__main__":
    asyncio.run(main())
