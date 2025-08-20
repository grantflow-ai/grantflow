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

variable "message_retention_duration" {
  description = "Message retention duration"
  type        = string
  default     = "86400s"
}

variable "ack_deadline_seconds" {
  description = "Acknowledgment deadline in seconds (deprecated, use specific variables)"
  type        = number
  default     = 60
}

variable "file_indexing_ack_deadline" {
  description = "Acknowledgment deadline for file-indexing subscription in seconds"
  type        = number
  default     = 900
}

variable "url_crawling_ack_deadline" {
  description = "Acknowledgment deadline for url-crawling subscription in seconds"
  type        = number
  default     = 600
}

variable "rag_processing_ack_deadline" {
  description = "Acknowledgment deadline for rag-processing subscription in seconds"
  type        = number
  default     = 900
}

variable "dlq_ack_deadline" {
  description = "Acknowledgment deadline for dead letter queue subscriptions in seconds"
  type        = number
  default     = 1200
}

variable "enable_dead_letter" {
  description = "Enable dead letter queues"
  type        = bool
  default     = false
}

variable "indexer_retry_minimum_backoff" {
  description = "Minimum backoff duration for indexer retries (to prevent burst storms)"
  type        = string
  default     = "30s"
}

variable "indexer_retry_maximum_backoff" {
  description = "Maximum backoff duration for indexer retries"
  type        = string
  default     = "600s"
}

variable "indexer_url" {
  description = "URL of the indexer Cloud Run service"
  type        = string
}

variable "crawler_url" {
  description = "URL of the crawler Cloud Run service"
  type        = string
}

variable "rag_url" {
  description = "URL of the RAG Cloud Run service"
  type        = string
}

variable "rag_service_account_email" {
  description = "Email of the RAG service account"
  type        = string
  default     = ""
}

resource "google_pubsub_topic" "file_indexing" {
  name = "file-indexing"

  message_retention_duration = var.message_retention_duration

  lifecycle {
    ignore_changes = all
  }
}

resource "google_pubsub_subscription" "file_indexing_subscription" {
  name  = "file-indexing-subscription"
  topic = google_pubsub_topic.file_indexing.name

  # ~keep File processing deadline (configurable)
  ack_deadline_seconds = var.file_indexing_ack_deadline

  # ~keep Increased backoff for indexer to handle burst traffic gracefully
  retry_policy {
    minimum_backoff = var.indexer_retry_minimum_backoff
    maximum_backoff = var.indexer_retry_maximum_backoff
  }

  enable_message_ordering = false

  # ~keep Flow control to prevent burst overload (429 errors)
  push_config {
    push_endpoint = var.indexer_url

    oidc_token {
      service_account_email = var.pubsub_invoker_service_account_email
      audience              = var.indexer_url
    }

    attributes = {
      "x-goog-version" = "v1"
    }
  }

  # ~keep Exponential backoff prevents retry storms during overload
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.file_indexing_dlq.id
    max_delivery_attempts = 10 # ~keep Increased for fanout pattern burst handling
  }

  # ~keep Exactly-once delivery is not compatible with push subscriptions

  # ~keep Set expiration policy to clean up inactive subscriptions
  expiration_policy {
    ttl = "2678400s"
  }
}

resource "google_pubsub_topic" "file_indexing_dlq" {
  name = "file-indexing-dlq"

  labels = {
    purpose = "dead-letter-queue"
  }
}

resource "google_pubsub_subscription" "file_indexing_dlq_subscription" {
  name  = "file-indexing-dlq-subscription"
  topic = google_pubsub_topic.file_indexing_dlq.name

  ack_deadline_seconds = var.dlq_ack_deadline

  message_retention_duration = "604800s"

  retain_acked_messages = true
}

resource "google_pubsub_topic" "url_crawling" {
  name = "url-crawling"

  lifecycle {
    ignore_changes = all
  }
}

resource "google_pubsub_subscription" "url_crawling_subscription" {
  name  = "url-crawling-subscription"
  topic = google_pubsub_topic.url_crawling.name

  # ~keep URL crawling deadline (configurable)
  ack_deadline_seconds = var.url_crawling_ack_deadline

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  enable_message_ordering = false

  push_config {
    push_endpoint = var.crawler_url

    oidc_token {
      service_account_email = var.pubsub_invoker_service_account_email
      audience              = var.crawler_url
    }

    attributes = {
      "x-goog-version" = "v1"
    }
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.url_crawling_dlq.id
    max_delivery_attempts = 10 # ~keep Increased for fanout pattern burst handling
  }
}

resource "google_pubsub_topic" "url_crawling_dlq" {
  name = "url-crawling-dlq"

  labels = {
    purpose = "dead-letter-queue"
  }
}

resource "google_pubsub_subscription" "url_crawling_dlq_subscription" {
  name  = "url-crawling-dlq-subscription"
  topic = google_pubsub_topic.url_crawling_dlq.name

  ack_deadline_seconds = var.dlq_ack_deadline

  message_retention_duration = "604800s"

  retain_acked_messages = true
}

resource "google_pubsub_topic_iam_member" "backend_publisher" {
  topic  = google_pubsub_topic.url_crawling.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

resource "google_pubsub_topic" "rag_processing" {
  name = "rag-processing"

  lifecycle {
    ignore_changes = all
  }
}

resource "google_pubsub_subscription" "rag_processing_subscription" {
  name  = "rag-processing-subscription"
  topic = google_pubsub_topic.rag_processing.name

  ack_deadline_seconds = var.rag_processing_ack_deadline

  retry_policy {
    minimum_backoff = "30s"
    maximum_backoff = "600s"
  }

  enable_message_ordering = false

  push_config {
    push_endpoint = var.rag_url

    oidc_token {
      service_account_email = var.pubsub_invoker_service_account_email
      audience              = var.rag_url
    }

    attributes = {
      "x-goog-version" = "v1"
    }
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.rag_processing_dlq.id
    max_delivery_attempts = 5
  }
}

resource "google_pubsub_topic" "rag_processing_dlq" {
  name = "rag-processing-dlq"

  labels = {
    purpose = "dead-letter-queue"
  }
}

resource "google_pubsub_subscription" "rag_processing_dlq_subscription" {
  name  = "rag-processing-dlq-subscription"
  topic = google_pubsub_topic.rag_processing_dlq.name

  ack_deadline_seconds = var.dlq_ack_deadline

  message_retention_duration = "604800s"

  retain_acked_messages = true
}

resource "google_pubsub_topic_iam_member" "backend_rag_publisher" {
  topic  = google_pubsub_topic.rag_processing.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

resource "google_pubsub_topic" "frontend_notifications" {
  name = "frontend-notifications"

  message_retention_duration = var.message_retention_duration

  lifecycle {
    ignore_changes = all
  }
}

resource "google_pubsub_topic" "frontend_notifications_dlq" {
  name = "frontend-notifications-dlq"

  labels = {
    purpose = "dead-letter-queue"
  }
}

resource "google_pubsub_subscription" "frontend_notifications_dlq_subscription" {
  name  = "frontend-notifications-dlq-subscription"
  topic = google_pubsub_topic.frontend_notifications_dlq.name

  ack_deadline_seconds = var.dlq_ack_deadline

  message_retention_duration = "604800s"

  retain_acked_messages = true
}

# NOTE: Subscriptions for frontend-notifications are created dynamically

resource "google_pubsub_topic_iam_member" "frontend_notifications_publisher" {
  topic  = google_pubsub_topic.frontend_notifications.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

resource "google_pubsub_topic_iam_member" "rag_frontend_notifications_publisher" {
  count  = var.rag_service_account_email != "" ? 1 : 0
  topic  = google_pubsub_topic.frontend_notifications.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${var.rag_service_account_email}"
}

resource "google_pubsub_topic_iam_member" "backend_subscriber" {
  topic  = google_pubsub_topic.frontend_notifications.name
  role   = "roles/pubsub.subscriber"
  member = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "backend_pubsub_editor" {
  project = var.project_id
  role    = "roles/pubsub.editor"
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

data "google_project" "project" {
  project_id = var.project_id
}

resource "google_pubsub_topic_iam_member" "file_indexing_dlq_publisher" {
  topic  = google_pubsub_topic.file_indexing_dlq.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_pubsub_topic_iam_member" "url_crawling_dlq_publisher" {
  topic  = google_pubsub_topic.url_crawling_dlq.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_pubsub_topic_iam_member" "rag_processing_dlq_publisher" {
  topic  = google_pubsub_topic.rag_processing_dlq.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_pubsub_topic_iam_member" "frontend_notifications_dlq_publisher" {
  topic  = google_pubsub_topic.frontend_notifications_dlq.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}