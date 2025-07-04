# Firebase App Hosting Error Monitoring

# Log-based alert policy for critical App Hosting errors
resource "google_logging_metric" "app_hosting_errors" {
  name   = "app_hosting_error_rate_${var.environment}"
  filter = <<EOF
resource.type="cloud_run_revision"
resource.labels.service_name="monorepo"
(severity="ERROR" OR severity="CRITICAL" OR severity="ALERT" OR severity="EMERGENCY")
OR (httpRequest.status>=500)
OR (jsonPayload.level="error" OR textPayload:"ERROR" OR textPayload:"FATAL")
EOF


  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "App Hosting Error Rate"
  }
}

# Alert policy for high error rate
resource "google_monitoring_alert_policy" "app_hosting_high_error_rate" {
  display_name = "App Hosting High Error Rate - ${title(var.environment)}"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "High error rate in App Hosting"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"logging.googleapis.com/user/app_hosting_error_rate_${var.environment}\""
      duration        = "300s" # 5 minutes
      comparison      = "COMPARISON_GT"
      threshold_value = 5

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.labels.service_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.discord_webhook.name]

  alert_strategy {
    auto_close = "86400s" # 24 hours
  }

  documentation {
    content = <<EOF
This alert fires when the App Hosting application experiences more than 5 errors per minute for 5 consecutive minutes.

## Troubleshooting Steps:
1. Check Firebase App Hosting logs: https://console.firebase.google.com/project/${var.project_id}/apphosting/monorepo
2. Check recent deployments in the same console
3. Verify environment variables and secrets are correctly set
4. Check Cloud Run logs: https://console.cloud.google.com/logs/query?project=${var.project_id}
5. Monitor application performance and resource usage

## Common Causes:
- Deployment issues with new code
- Environment variable misconfigurations
- Database connectivity problems
- Memory or CPU resource exhaustion
- External service failures (Firebase, etc.)
EOF
  }
}

# TODO: Add deployment failure alerts when log format is clarified

# Alert for high memory usage (potential OOM)
resource "google_monitoring_alert_policy" "app_hosting_high_memory" {
  display_name = "App Hosting High Memory Usage - ${title(var.environment)}"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Memory usage above 80%"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"monorepo\" AND metric.type=\"run.googleapis.com/container/memory/utilizations\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.labels.service_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.discord_webhook.name]

  documentation {
    content = "App Hosting memory usage is above 80%. This may lead to out-of-memory errors."
  }
}

# Cloud Function to send detailed App Hosting alerts to Discord
resource "google_cloudfunctions2_function" "app_hosting_alerts_to_discord" {
  name        = "app-hosting-alerts-to-discord-${var.environment}"
  location    = "us-central1"
  description = "Send App Hosting alerts to Discord with detailed information"

  build_config {
    runtime     = "python312"
    entry_point = "app_hosting_alert_to_discord"

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.app_hosting_function_zip.name
      }
    }
  }

  service_config {
    available_memory   = "256M"
    timeout_seconds    = 60
    max_instance_count = 10

    environment_variables = {
      DISCORD_WEBHOOK_URL = var.discord_webhook_url
      ENVIRONMENT         = var.environment
      PROJECT_ID          = var.project_id
    }

    service_account_email = google_service_account.app_hosting_alerts_function.email
  }

  event_trigger {
    event_type            = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic          = google_pubsub_topic.app_hosting_alerts.id
    service_account_email = google_service_account.app_hosting_alerts_function.email
  }
}

# Pub/Sub topic for App Hosting alerts
resource "google_pubsub_topic" "app_hosting_alerts" {
  name = "app-hosting-alerts-${var.environment}"
}

# Service account for App Hosting alerts function
resource "google_service_account" "app_hosting_alerts_function" {
  account_id   = "app-hosting-alerts-${var.environment}"
  display_name = "App Hosting Alerts Function"
  description  = "Service account for App Hosting alerts Cloud Function"
}

# Upload the App Hosting alerts function code
resource "google_storage_bucket_object" "app_hosting_function_zip" {
  name   = "app-hosting-alert-function-${data.archive_file.app_hosting_function.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.app_hosting_function.output_path
}

# Create the App Hosting alerts function code archive
data "archive_file" "app_hosting_function" {
  type        = "zip"
  output_path = "${path.module}/app-hosting-alert-function.zip"

  source {
    content  = file("${path.root}/../cloud_functions/app_hosting_alert_function.py")
    filename = "main.py"
  }

  source {
    content  = file("${path.root}/../cloud_functions/requirements.txt")
    filename = "requirements.txt"
  }
}

# Discord notification channel
resource "google_monitoring_notification_channel" "discord_webhook" {
  display_name = "Discord Webhook - ${title(var.environment)}"
  type         = "pubsub"

  labels = {
    topic = google_pubsub_topic.app_hosting_alerts.id
  }

  description = "Send alerts to Discord via Pub/Sub and Cloud Function"
}