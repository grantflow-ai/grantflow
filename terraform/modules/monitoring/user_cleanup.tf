# User cleanup Cloud Function and scheduling

# Storage bucket for Cloud Function source
resource "google_storage_bucket" "user_cleanup_functions" {
  name                        = "${var.project_id}-user-cleanup-functions"
  location                    = "US"
  force_destroy               = true
  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }
}

# Package the Cloud Function source
data "archive_file" "user_cleanup_source" {
  type        = "zip"
  output_path = "${path.module}/user-cleanup-function.zip"

  source {
    content  = file("${path.root}/../cloud_functions/src/user_cleanup/main.py")
    filename = "main.py"
  }

  source {
    content  = file("${path.root}/../cloud_functions/requirements.txt")
    filename = "requirements.txt"
  }
}

# Upload source to bucket
resource "google_storage_bucket_object" "user_cleanup_source" {
  name   = "user-cleanup-function-${data.archive_file.user_cleanup_source.output_md5}.zip"
  bucket = google_storage_bucket.user_cleanup_functions.name
  source = data.archive_file.user_cleanup_source.output_path
}

# Service account for the Cloud Function
resource "google_service_account" "user_cleanup" {
  account_id   = "user-cleanup-function"
  display_name = "User Cleanup Function Service Account"
  description  = "Service account for automated user deletion cleanup"
}

# IAM permissions for the function
resource "google_project_iam_member" "user_cleanup_permissions" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/datastore.user",
    "roles/firebase.admin",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/cloudtrace.agent"
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.user_cleanup.email}"
}

# Pub/Sub topic for scheduling
resource "google_pubsub_topic" "user_cleanup_schedule" {
  name = "user-cleanup-schedule"

  labels = {
    environment = var.environment
    purpose     = "user_cleanup"
  }
}

# Cloud Function for user cleanup
resource "google_cloudfunctions2_function" "user_cleanup" {
  name        = "user-cleanup-function"
  location    = "us-central1"
  description = "Automated cleanup of users scheduled for deletion"

  build_config {
    runtime     = "python312"
    entry_point = "main"

    source {
      storage_source {
        bucket = google_storage_bucket.user_cleanup_functions.name
        object = google_storage_bucket_object.user_cleanup_source.name
      }
    }
  }

  service_config {
    max_instance_count               = 1
    min_instance_count               = 0
    available_memory                 = "512M"
    timeout_seconds                  = 540
    max_instance_request_concurrency = 1

    environment_variables = {
      GOOGLE_CLOUD_PROJECT = var.project_id
      CLOUD_SQL_INSTANCE   = "grantflow-db"
      CLOUD_SQL_REGION     = "us-central1"
      DATABASE_NAME        = "grantflow"
      DATABASE_USER        = "grantflow"
    }

    # Reference to database password from Secret Manager
    secret_environment_variables {
      key        = "DATABASE_PASSWORD"
      project_id = var.project_id
      secret     = "database-password"
      version    = "latest"
    }

    service_account_email = google_service_account.user_cleanup.email
  }

  event_trigger {
    trigger_region = "us-central1"
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.user_cleanup_schedule.id

    retry_policy = "RETRY_POLICY_RETRY"
  }

  lifecycle {
    ignore_changes = [
      build_config[0].source[0].storage_source[0].object
    ]
  }
}

# Cloud Scheduler job to trigger cleanup daily at 2 AM UTC
resource "google_cloud_scheduler_job" "user_cleanup_daily" {
  name             = "user-cleanup-daily"
  description      = "Daily cleanup of users scheduled for deletion"
  schedule         = "0 2 * * *" # 2 AM UTC daily
  time_zone        = "UTC"
  attempt_deadline = "600s"
  region           = "us-central1"

  pubsub_target {
    topic_name = google_pubsub_topic.user_cleanup_schedule.id
    data = base64encode(jsonencode({
      action    = "cleanup_expired_users"
      timestamp = "scheduled"
    }))
  }

  retry_config {
    retry_count          = 3
    max_retry_duration   = "60s"
    max_backoff_duration = "30s"
    min_backoff_duration = "5s"
  }
}

# Monitoring alert for failed user cleanup
resource "google_monitoring_alert_policy" "user_cleanup_failures" {
  display_name = "User Cleanup Function Failures"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Cloud Function execution failures"

    condition_threshold {
      filter          = "resource.type=\"cloud_function\" AND resource.labels.function_name=\"user-cleanup-function\" AND metric.type=\"logging.googleapis.com/log_entry_count\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0

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
    auto_close = "1800s" # Auto-close after 30 minutes
  }
}

# Log-based metric for user cleanup operations
resource "google_logging_metric" "user_cleanup_operations" {
  name   = "user_cleanup_operations"
  filter = "resource.type=\"cloud_function\" AND resource.labels.function_name=\"user-cleanup-function\" AND jsonPayload.processed>=0"

  metric_descriptor {
    metric_kind  = "GAUGE"
    value_type   = "INT64"
    unit         = "1"
    display_name = "User Cleanup Operations"
  }

  value_extractor = "EXTRACT(jsonPayload.processed)"

  label_extractors = {
    status = "EXTRACT(jsonPayload.statusCode)"
  }
}

# Output the function details
output "user_cleanup_function_name" {
  description = "Name of the user cleanup Cloud Function"
  value       = google_cloudfunctions2_function.user_cleanup.name
}

output "user_cleanup_schedule" {
  description = "Schedule for user cleanup job"
  value       = google_cloud_scheduler_job.user_cleanup_daily.schedule
}