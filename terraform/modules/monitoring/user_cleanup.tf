
resource "google_cloud_scheduler_job" "entity_cleanup_daily" {
  name             = "entity-cleanup-daily"
  description      = "Daily cleanup of users and organizations with expired soft deletes"
  schedule         = "0 2 * * *"
  time_zone        = "UTC"
  attempt_deadline = "600s"
  region           = "us-central1"

  http_target {
    uri         = "https://backend-zqiconmjeq-uc.a.run.app/webhooks/scheduler/entity-cleanup"
    http_method = "POST"

    headers = {
      "Content-Type" = "application/json"
    }

    body = base64encode(jsonencode({
      action    = "cleanup_expired_entities"
      timestamp = "scheduled"
    }))

    oidc_token {
      service_account_email = "scheduler-invoker@grantflow.iam.gserviceaccount.com"
      audience              = "https://backend-zqiconmjeq-uc.a.run.app/webhooks/scheduler/entity-cleanup"
    }
  }

  # ~keep The scheduler job continues below

  retry_config {
    retry_count          = 3
    max_retry_duration   = "60s"
    max_backoff_duration = "30s"
    min_backoff_duration = "5s"
  }
}

resource "google_monitoring_alert_policy" "entity_cleanup_failures" {
  display_name = "Entity Cleanup Webhook Failures"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Entity cleanup webhook failures"

    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"backend\" AND metric.type=\"logging.googleapis.com/user/entity_cleanup_operations\""
      duration        = "300s"
      comparison      = "COMPARISON_LT"
      threshold_value = 1

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.discord.name
  ]

  alert_strategy {
    auto_close = "1800s"
  }
}

resource "google_logging_metric" "entity_cleanup_operations" {
  name   = "entity_cleanup_operations"
  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"backend\" AND jsonPayload.path=\"/webhooks/scheduler/entity-cleanup\" AND jsonPayload.processed>=0"

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    labels {
      key         = "status"
      value_type  = "STRING"
      description = "Status of the cleanup operation (success/error)"
    }
  }

  label_extractors = {
    status = "EXTRACT(jsonPayload.status)"
  }
}