terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

variable "project_id" {
  description = "The project ID to deploy to"
  type        = string
  default     = "grantflow"
}

variable "region" {
  description = "The region for the Cloud Run service"
  type        = string
  default     = "us-central1"
}

variable "pubsub_invoker_service_account_email" {
  description = "Email of the service account used for Pub/Sub to invoke Cloud Run"
  type        = string
}

resource "google_pubsub_topic" "file_indexing" {
  name = "file-indexing"

  lifecycle {
    ignore_changes = all
  }
}

# Push subscription to trigger the indexer Cloud Run service
resource "google_pubsub_subscription" "file_indexing_subscription" {
  name  = "file-indexing-subscription"
  topic = google_pubsub_topic.file_indexing.name

  ack_deadline_seconds = 60

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  enable_message_ordering = false

  # Configure push to Cloud Run
  push_config {
    push_endpoint = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/services/indexer:call"

    # Authentication for the push endpoint
    oidc_token {
      service_account_email = var.pubsub_invoker_service_account_email
      audience              = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/services/indexer"
    }

    # This attribute specifies that we have a minimum number of failed attempts before acking the message
    attributes = {
      "x-goog-version" = "v1"
    }
  }

  # Configure exponential backoff for failed deliveries
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.file_indexing_dlq.id
    max_delivery_attempts = 5
  }
}

# Dead letter queue topic for failed message processing
resource "google_pubsub_topic" "file_indexing_dlq" {
  name = "file-indexing-dlq"

  # Add labels for easier identification
  labels = {
    purpose = "dead-letter-queue"
  }
}

# Subscription to monitor the dead letter queue
resource "google_pubsub_subscription" "file_indexing_dlq_subscription" {
  name  = "file-indexing-dlq-subscription"
  topic = google_pubsub_topic.file_indexing_dlq.name

  ack_deadline_seconds = 60

  # Keep messages for 7 days
  message_retention_duration = "604800s"

  # Retain acknowledged messages
  retain_acked_messages = true
}

# URL Crawler topic
resource "google_pubsub_topic" "url_crawling" {
  name = "url-crawling"

  lifecycle {
    ignore_changes = all
  }
}

# Push subscription to trigger the crawler Cloud Run service
resource "google_pubsub_subscription" "url_crawling_subscription" {
  name  = "url-crawling-subscription"
  topic = google_pubsub_topic.url_crawling.name

  ack_deadline_seconds = 60

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  enable_message_ordering = false

  # Configure push to Cloud Run
  push_config {
    push_endpoint = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/services/crawler:call"

    # Authentication for the push endpoint
    oidc_token {
      service_account_email = var.pubsub_invoker_service_account_email
      audience              = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/services/crawler"
    }

    # This attribute specifies that we have a minimum number of failed attempts before acking the message
    attributes = {
      "x-goog-version" = "v1"
    }
  }

  # Configure exponential backoff for failed deliveries
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.url_crawling_dlq.id
    max_delivery_attempts = 5
  }
}

# Dead letter queue topic for failed message processing in URL crawling
resource "google_pubsub_topic" "url_crawling_dlq" {
  name = "url-crawling-dlq"

  # Add labels for easier identification
  labels = {
    purpose = "dead-letter-queue"
  }
}

# Subscription to monitor the URL crawling dead letter queue
resource "google_pubsub_subscription" "url_crawling_dlq_subscription" {
  name  = "url-crawling-dlq-subscription"
  topic = google_pubsub_topic.url_crawling_dlq.name

  ack_deadline_seconds = 60

  # Keep messages for 7 days
  message_retention_duration = "604800s"

  # Retain acknowledged messages
  retain_acked_messages = true
}

# IAM binding to allow the backend service account to publish to the URL crawling topic
resource "google_pubsub_topic_iam_member" "backend_publisher" {
  topic  = google_pubsub_topic.url_crawling.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# Frontend Notifications topic
resource "google_pubsub_topic" "frontend_notifications" {
  name = "frontend-notifications"

  lifecycle {
    ignore_changes = all
  }
}

# NOTE: Subscriptions for frontend-notifications are created dynamically
# by the application with parent_id filters. See pubsub.py:ensure_subscription_for_parent_id

# IAM binding to allow services to publish to the frontend notifications topic
resource "google_pubsub_topic_iam_member" "frontend_notifications_publisher" {
  topic  = google_pubsub_topic.frontend_notifications.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# IAM binding to allow backend to create and subscribe to dynamic subscriptions
resource "google_pubsub_topic_iam_member" "backend_subscriber" {
  topic  = google_pubsub_topic.frontend_notifications.name
  role   = "roles/pubsub.subscriber"
  member = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# IAM binding to allow backend to create subscriptions
resource "google_project_iam_member" "backend_pubsub_editor" {
  project = var.project_id
  role    = "roles/pubsub.editor"
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# Data source to get the project number for the default service account
data "google_project" "project" {
  project_id = var.project_id
}
