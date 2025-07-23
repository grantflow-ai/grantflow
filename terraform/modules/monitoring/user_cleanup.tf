# User and organization cleanup Cloud Function and scheduling

# Storage bucket for Cloud Function source
# trivy:ignore:AVD-GCP-0066
resource "google_storage_bucket" "entity_cleanup_functions" {
  name                        = "${var.project_id}-entity-cleanup-functions"
  location                    = "US"
  force_destroy               = true
  uniform_bucket_level_access = true

  dynamic "encryption" {
    for_each = var.enable_kms_encryption ? [1] : []
    content {
      default_kms_key_name = google_kms_crypto_key.monitoring_bucket_key[0].id
    }
  }

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
data "archive_file" "entity_cleanup_source" {
  type        = "zip"
  output_path = "${path.module}/entity-cleanup-function.zip"

  source {
    content  = file("${path.root}/../cloud_functions/src/user_cleanup/main.py")
    filename = "main.py"
  }

  source {
    content  = file("${path.module}/../../cloud_functions/requirements.txt")
    filename = "requirements.txt"
  }
}

# Upload source to bucket
resource "google_storage_bucket_object" "entity_cleanup_source" {
  name   = "entity-cleanup-function-${data.archive_file.entity_cleanup_source.output_md5}.zip"
  bucket = google_storage_bucket.entity_cleanup_functions.name
  source = data.archive_file.entity_cleanup_source.output_path
}

# Service account for the Cloud Function
resource "google_service_account" "entity_cleanup" {
  account_id   = "entity-cleanup-function"
  display_name = "Entity Cleanup Function Service Account"
  description  = "Service account for automated user and organization deletion cleanup"
}

# IAM permissions for the function
resource "google_project_iam_member" "entity_cleanup_permissions" {
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
  member  = "serviceAccount:${google_service_account.entity_cleanup.email}"
}

# Pub/Sub topic for scheduling
resource "google_pubsub_topic" "entity_cleanup_schedule" {
  name = "entity-cleanup-schedule"

  labels = {
    environment = var.environment
    purpose     = "entity_cleanup"
  }
}

# Cloud Function for user and organization cleanup
resource "google_cloudfunctions2_function" "entity_cleanup" {
  name        = "entity-cleanup-function"
  location    = "us-central1"
  description = "Automated cleanup of users and organizations with expired soft deletes"

  build_config {
    runtime     = "python312"
    entry_point = "main"

    source {
      storage_source {
        bucket = google_storage_bucket.entity_cleanup_functions.name
        object = google_storage_bucket_object.entity_cleanup_source.name
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
      GOOGLE_CLOUD_PROJECT                     = var.project_id
      CLOUD_SQL_INSTANCE                       = "grantflow-db"
      CLOUD_SQL_REGION                         = "us-central1"
      DATABASE_NAME                            = "grantflow"
      DATABASE_USER                            = "grantflow"
      USER_DELETION_GRACE_PERIOD_DAYS          = "10"
      ORGANIZATION_DELETION_GRACE_PERIOD_DAYS  = "30"
    }

    # Reference to database connection string from Secret Manager
    secret_environment_variables {
      key        = "DATABASE_CONNECTION_STRING"
      project_id = var.project_id
      secret     = "DATABASE_CONNECTION_STRING"
      version    = "latest"
    }

    service_account_email = google_service_account.entity_cleanup.email
  }

  event_trigger {
    trigger_region = "us-central1"
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.entity_cleanup_schedule.id

    retry_policy = "RETRY_POLICY_RETRY"
  }

  lifecycle {
    ignore_changes = [
      build_config[0].source[0].storage_source[0].object
    ]
  }
}

# Cloud Scheduler job to trigger cleanup daily at 2 AM UTC
resource "google_cloud_scheduler_job" "entity_cleanup_daily" {
  name             = "entity-cleanup-daily"
  description      = "Daily cleanup of users and organizations with expired soft deletes"
  schedule         = "0 2 * * *" # 2 AM UTC daily
  time_zone        = "UTC"
  attempt_deadline = "600s"
  region           = "us-central1"

  pubsub_target {
    topic_name = google_pubsub_topic.entity_cleanup_schedule.id
    data = base64encode(jsonencode({
      action    = "cleanup_expired_entities"
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

# Monitoring alert for failed entity cleanup
resource "google_monitoring_alert_policy" "entity_cleanup_failures" {
  display_name = "Entity Cleanup Function Failures"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Cloud Function execution failures"

    condition_threshold {
      filter          = "resource.type=\"cloud_function\" AND resource.labels.function_name=\"entity-cleanup-function\" AND metric.type=\"logging.googleapis.com/log_entry_count\""
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

# Log-based metric for entity cleanup operations
resource "google_logging_metric" "entity_cleanup_operations" {
  name   = "entity_cleanup_operations"
  filter = "resource.type=\"cloud_function\" AND resource.labels.function_name=\"entity-cleanup-function\" AND jsonPayload.processed>=0"
}

# Additional monitoring for organization cleanup
resource "google_monitoring_alert_policy" "organization_cleanup_failures" {
  display_name = "Organization Cleanup Failures"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "High error rate in organization cleanup"

    condition_threshold {
      filter          = "resource.type=\"cloud_function\" AND resource.labels.function_name=\"entity-cleanup-function\" AND metric.type=\"logging.googleapis.com/user/entity_cleanup_operations\" AND metric.labels.error=\"true\""
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

# Output the function details
output "entity_cleanup_function_name" {
  description = "Name of the entity cleanup Cloud Function"
  value       = google_cloudfunctions2_function.entity_cleanup.name
}

output "entity_cleanup_schedule" {
  description = "Schedule for entity cleanup job"
  value       = google_cloud_scheduler_job.entity_cleanup_daily.schedule
}

output "user_deletion_grace_period" {
  description = "Grace period for user deletion in days"
  value       = "10"
}

output "organization_deletion_grace_period" {
  description = "Grace period for organization deletion in days"
  value       = "30"
}