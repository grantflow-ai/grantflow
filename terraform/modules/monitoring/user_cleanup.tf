

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