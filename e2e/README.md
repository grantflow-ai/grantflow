# GrantFlow E2E Testing

End-to-end testing utilities for the GrantFlow application stack.

## Modules

### `monitoring`
Utilities for testing monitoring systems and Discord integrations.

### `webhooks`
Testing utilities for webhook integrations and external service notifications.

## Usage

```python
from e2e.monitoring import MonitoringTester
from e2e.webhooks import DiscordWebhookTester

# Test Discord webhook
webhook_tester = DiscordWebhookTester("your_webhook_url")
await webhook_tester.test_basic_message()

# Test comprehensive monitoring
monitoring_tester = MonitoringTester("webhook_url", "staging")
await monitoring_tester.test_all_alert_types()
```

## Running Tests

```bash
# Run all e2e tests
uv run pytest e2e/tests/

# Run specific test module
uv run pytest e2e/tests/test_monitoring.py

# Run with specific marker
uv run pytest e2e/tests/ -m "webhook"
```