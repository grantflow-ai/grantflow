resource "google_logging_metric" "indexer_non_retriable_failures" {
  project     = var.project_id
  name        = "indexer_non_retriable_failures"
  description = "Count non-retriable indexer failures in staging"
  filter      = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"indexer\" AND jsonPayload.event=\"Acknowledged non-retriable indexing failure\""

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    unit         = "1"
    display_name = "Indexer Non-Retriable Failures"
  }
}

resource "google_logging_metric" "crawler_non_retriable_failures" {
  project     = var.project_id
  name        = "crawler_non_retriable_failures"
  description = "Count non-retriable crawler failures in staging"
  filter      = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"crawler\" AND jsonPayload.event=\"Acknowledged non-retriable crawling failure\""

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    unit         = "1"
    display_name = "Crawler Non-Retriable Failures"
  }
}

resource "google_logging_metric" "email_webhook_missing_application" {
  project     = var.project_id
  name        = "email_webhook_missing_application"
  description = "Count email webhook invocations skipped because the application no longer exists"
  filter      = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"backend\" AND jsonPayload.event=\"Email webhook application missing\""

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    unit         = "1"
    display_name = "Email webhook skipped notifications"
  }
}
