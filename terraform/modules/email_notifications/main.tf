terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
  }
}

# ~keep Default encryption is acceptable for function source code
resource "google_storage_bucket" "email_notification_functions" {
  name                        = "${var.project_id}-email-notification-functions"
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

data "archive_file" "email_notification_source" {
  type        = "zip"
  output_path = "${path.module}/email-notification-function.zip"

  source {
    content  = file("${path.root}/../cloud_functions/src/email_notifications/main.py")
    filename = "main.py"
  }

  source {
    content  = file("${path.root}/../cloud_functions/requirements.txt")
    filename = "requirements.txt"
  }

  source {
    content  = file("${path.root}/../cloud_functions/src/email_notifications/templates/application_ready.html")
    filename = "templates/application_ready.html"
  }

  source {
    content  = file("${path.root}/../cloud_functions/src/email_notifications/templates/grant_alert.html")
    filename = "templates/grant_alert.html"
  }
}

resource "google_storage_bucket_object" "email_notification_source" {
  name   = "email-notification-function-${data.archive_file.email_notification_source.output_md5}.zip"
  bucket = google_storage_bucket.email_notification_functions.name
  source = data.archive_file.email_notification_source.output_path
}

resource "google_service_account" "email_notification" {
  account_id   = "fn-email-notify-sa-${var.environment}"
  display_name = "Email Notification Function Service Account"
  description  = "Service account for sending email notifications when applications are generated"
}

resource "google_project_iam_member" "email_notification_permissions" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/cloudtrace.agent",
    "roles/storage.objectViewer",
    "roles/secretmanager.secretAccessor"
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.email_notification.email}"
}

resource "google_pubsub_topic" "email_notifications" {
  name = "email-notifications"

  message_retention_duration = "86400s"

  labels = {
    environment = var.environment
    purpose     = "email_notifications"
  }
}

resource "google_pubsub_topic" "email_notifications_dlq" {
  name = "email-notifications-dlq"

  message_retention_duration = "604800s"

  labels = {
    environment = var.environment
    purpose     = "dead-letter-queue"
  }
}

resource "google_pubsub_subscription" "email_notifications_dlq_subscription" {
  name  = "email-notifications-dlq-subscription"
  topic = google_pubsub_topic.email_notifications_dlq.name

  ack_deadline_seconds = 60

  message_retention_duration = "604800s"

  retain_acked_messages = true

  labels = {
    environment = var.environment
    purpose     = "dead-letter-monitoring"
  }
}

resource "google_pubsub_topic_iam_member" "rag_publisher" {
  topic  = google_pubsub_topic.email_notifications.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${var.rag_service_account_email}"
}

resource "google_cloudfunctions2_function" "email_notification" {
  name        = "fn-email-notify-${var.environment}"
  location    = var.region
  description = "Send email notifications when grant applications are generated"

  build_config {
    runtime     = "python312"
    entry_point = "main"

    source {
      storage_source {
        bucket = google_storage_bucket.email_notification_functions.name
        object = google_storage_bucket_object.email_notification_source.name
      }
    }
  }

  service_config {
    max_instance_count               = 10
    min_instance_count               = 0
    available_memory                 = "512M"
    timeout_seconds                  = 300
    max_instance_request_concurrency = 1

    environment_variables = {
      GOOGLE_CLOUD_PROJECT = var.project_id
      ENVIRONMENT          = var.environment
      SITE_URL             = var.environment == "staging" ? "https://staging.grantflow.ai" : "https://grantflow.ai"
    }

    secret_environment_variables {
      key        = "RESEND_API_KEY"
      project_id = var.project_id
      secret     = "RESEND_API_KEY_${upper(var.environment)}"
      version    = "latest"
    }

    secret_environment_variables {
      key        = "DATABASE_CONNECTION_STRING"
      project_id = var.project_id
      secret     = "DATABASE_CONNECTION_STRING"
      version    = "latest"
    }

    service_account_email = google_service_account.email_notification.email
  }

  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.email_notifications.id

    retry_policy = "RETRY_POLICY_RETRY"
  }

  lifecycle {
    ignore_changes = [
      build_config[0].source[0].storage_source[0].object
    ]
  }
}

resource "google_logging_metric" "email_notification_operations" {
  name   = "email_notification_operations"
  filter = "resource.type=\"cloud_function\" AND resource.labels.function_name=\"fn-email-notify-${var.environment}\" AND jsonPayload.status!=\"\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    labels {
      key         = "status"
      value_type  = "STRING"
      description = "Status of the email notification (success/error)"
    }
  }

  label_extractors = {
    status = "EXTRACT(jsonPayload.status)"
  }
}

