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

# Firebase App Hosting Deployment Failure Alerts

# Log-based metric for Cloud Build failures (App Hosting builds)
resource "google_logging_metric" "app_hosting_build_failures" {
  name   = "app_hosting_build_failures_${var.environment}"
  filter = <<EOF
resource.type="build"
logName="projects/${var.project_id}/logs/cloudbuild"
(severity="ERROR" OR severity="CRITICAL")
AND (
  jsonPayload.message:"failed" 
  OR jsonPayload.message:"error"
  OR jsonPayload.message:"package.json"
  OR jsonPayload.message:"apphosting.yaml"
  OR textPayload:"BUILD FAILURE"
  OR textPayload:"ERROR"
)
EOF

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "App Hosting Build Failures"
  }
}

# Alert policy for build failures
resource "google_monitoring_alert_policy" "app_hosting_build_failures" {
  display_name = "Firebase App Hosting Build Failures - ${title(var.environment)}"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Build failure detected"

    condition_threshold {
      filter          = "resource.type=\"build\" AND metric.type=\"logging.googleapis.com/user/app_hosting_build_failures_${var.environment}\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.discord_webhook.name]

  alert_strategy {
    auto_close = "3600s" # Auto-close after 1 hour
  }

  documentation {
    content = <<EOF
This alert fires when Firebase App Hosting build failures are detected.

## Troubleshooting Steps:
1. Check Firebase App Hosting builds: https://console.firebase.google.com/project/${var.project_id}/apphosting
2. Review Cloud Build logs: https://console.cloud.google.com/cloud-build/builds?project=${var.project_id}
3. Verify apphosting.yaml configuration is correct
4. Check package.json and build dependencies
5. Review framework configuration and build scripts

## Common Causes:
- Missing or incorrect apphosting.yaml file
- Build dependency failures (package.json issues)
- Framework configuration errors
- Environment variable misconfigurations
- Build timeout or resource limitations
EOF
  }
}

# Log-based metric for deployment failures  
resource "google_logging_metric" "app_hosting_deployment_failures" {
  name   = "app_hosting_deployment_failures_${var.environment}"
  filter = <<EOF
resource.type="cloud_run_revision"
resource.labels.service_name="monorepo"
(
  jsonPayload.message:"deployment failed"
  OR jsonPayload.message:"rollout failed"
  OR jsonPayload.message:"revision failed"
  OR textPayload:"DEPLOYMENT_FAILED"
  OR textPayload:"ROLLOUT_FAILED"
)
EOF

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    display_name = "App Hosting Deployment Failures"
  }
}

# Alert policy for deployment failures
resource "google_monitoring_alert_policy" "app_hosting_deployment_failures" {
  display_name = "Firebase App Hosting Deployment Failures - ${title(var.environment)}"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Deployment failure detected"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND metric.type=\"logging.googleapis.com/user/app_hosting_deployment_failures_${var.environment}\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.discord_webhook.name]

  alert_strategy {
    auto_close = "3600s" # Auto-close after 1 hour
  }

  documentation {
    content = <<EOF
This alert fires when Firebase App Hosting deployment failures are detected.

## Troubleshooting Steps:
1. Check App Hosting rollouts: https://console.firebase.google.com/project/${var.project_id}/apphosting
2. Review Cloud Run deployment logs: https://console.cloud.google.com/run?project=${var.project_id}
3. Check for configuration issues in apphosting.yaml
4. Verify secrets and environment variables
5. Review resource allocation and limits

## Common Causes:
- Failed Cloud Run revision deployment
- Resource allocation issues
- Environment configuration problems
- Network connectivity issues
- Service account permission problems
EOF
  }
}

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
    entry_point = "app_hosting_alert_to_discord_sync"

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
      DISCORD_ROLE_ALERTS = var.discord_role_alerts
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

# Allow Pub/Sub to invoke the App Hosting alerts function
resource "google_pubsub_topic_iam_member" "app_hosting_function_subscriber" {
  topic  = google_pubsub_topic.app_hosting_alerts.name
  role   = "roles/pubsub.subscriber"
  member = "serviceAccount:${google_service_account.app_hosting_alerts_function.email}"
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
    content  = file("../cloud_functions/src/app_hosting_alert_function.py")
    filename = "main.py"
  }

  source {
    content  = file("../cloud_functions/requirements.txt")
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