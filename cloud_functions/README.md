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

Dependencies are managed using `pyproject.toml` files and automatically generated `requirements.txt` files for Cloud Functions deployment.

### Managing Dependencies

1. **Add dependencies** to the appropriate `pyproject.toml` file:
   - Root functions: `cloud_functions/pyproject.toml`
   - User cleanup function: `cloud_functions/user_cleanup/pyproject.toml`

2. **Generate requirements.txt** files for deployment:
   ```bash
   task cloud-functions:generate-requirements
   ```

3. **Sync development environment**:
   ```bash
   task cloud-functions:sync
   ```

### Workflow

- Edit `pyproject.toml` files to add/update dependencies
- Run `task cloud-functions:generate-requirements` to create deployment-ready `requirements.txt` files
- The generated `requirements.txt` files are used by Cloud Functions during deployment

## Deployment

Cloud Functions are deployed via Terraform in `terraform/modules/monitoring/`.