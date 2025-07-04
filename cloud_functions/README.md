# Cloud Functions

Python Cloud Functions for monitoring and alerting.

## Functions

### App Hosting Alerts (`app_hosting_alert_function.py`)
Processes Firebase App Hosting alerts and sends formatted notifications to Discord via webhook.

**Triggers:**
- Pub/Sub topic: `app-hosting-alerts-staging`
- Event type: `google.cloud.pubsub.topic.v1.messagePublished`

**Features:**
- Rich Discord embeds with alert details
- Priority-based color coding and notifications
- Quick links to Firebase and GCP consoles
- Error handling and fallback messaging

### Budget Alerts (`budget_function.py`)
Processes GCP billing budget alerts and forwards them to Discord.

**Triggers:**
- Pub/Sub topic: `budget-alerts-staging`
- Event type: `google.cloud.pubsub.topic.v1.messagePublished`

**Features:**
- Budget threshold notifications
- Spend tracking and forecasting alerts
- Discord integration for team notifications

## Dependencies

See `requirements.txt` for Python dependencies.

## Deployment

Cloud Functions are deployed via Terraform in `terraform/modules/monitoring/`.