# GrantFlow Cloud Functions

Serverless Python functions for event processing and monitoring.

## Structure

```
cloud_functions/
├── src/
│   ├── app_hosting_alerts/    # Firebase App Hosting alert notifications
│   ├── budget_alerts/         # GCP Budget alert notifications  
│   └── user_cleanup/          # Scheduled user cleanup function
├── tests/
│   ├── app_hosting_alerts/
│   ├── budget_alerts/
│   └── user_cleanup/
├── pyproject.toml             # Dependencies and project config
├── requirements.txt           # Compiled dependencies for deployment
└── README.md                  # This file
```

## Functions

### App Hosting Alerts (`src/app_hosting_alerts/`)
- **Purpose**: Forwards Firebase App Hosting monitoring alerts to Discord
- **Trigger**: Pub/Sub topic `app-hosting-alerts-{environment}`
- **Entry Point**: `app_hosting_alert_to_discord_sync`
- **Alerts**: Build failures, deployment issues, high error rates, memory usage

### Budget Alerts (`src/budget_alerts/`)
- **Purpose**: Forwards GCP billing budget alerts to Discord
- **Trigger**: Pub/Sub topic `budget-alerts-{environment}`
- **Entry Point**: `budget_alert_to_discord_sync`
- **Alerts**: Budget thresholds (50%, 75%, 90%, 100%, 120% forecasted)

### User Cleanup (`src/user_cleanup/`)
- **Purpose**: Scheduled cleanup of expired user accounts
- **Trigger**: Cloud Scheduler (daily)
- **Entry Point**: `main`
- **Actions**: Deletes Firebase users and database records after grace period

## Development

### Setup
```bash
# Install dependencies
uv sync

# Run tests
PYTHONPATH=. uv run pytest tests/

# Run linting
uv run ruff check src/
uv run ruff format src/
uv run mypy src/
```

### Testing
- **Unit tests**: Fast tests with mocked dependencies
- **Integration tests**: Real Discord webhook testing (requires env vars)
- **Coverage**: Aim for 80%+ test coverage

### Environment Variables
Functions require these environment variables:
- `DISCORD_WEBHOOK_URL`: Discord webhook for alerts
- `ENVIRONMENT`: Environment name (staging/production)
- `PROJECT_ID`: GCP project ID
- `DISCORD_ROLE_ALERTS`: Discord role ID for critical alerts

## Deployment

Functions are deployed via Terraform in `/terraform/modules/monitoring/`:
- `app_hosting_alerts.tf` - App Hosting monitoring function
- `budget.tf` - Budget monitoring function  
- `user_cleanup.tf` - User cleanup function

Each function is packaged as a zip file and deployed to Cloud Functions Gen2.

## Monitoring

All functions include:
- Structured logging with error context
- Discord webhook integration for alerts
- IAM permissions for Pub/Sub and Cloud Run
- Retry policies and error handling
- Performance and usage metrics

## Links

- [Firebase App Hosting Console](https://console.firebase.google.com/project/grantflow/apphosting)
- [GCP Cloud Functions](https://console.cloud.google.com/functions/list?project=grantflow)
- [Monitoring Dashboards](https://console.cloud.google.com/monitoring?project=grantflow)