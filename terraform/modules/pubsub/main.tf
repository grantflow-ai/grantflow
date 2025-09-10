terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
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

resource "google_pubsub_topic" "email_notifications" {
  name = "email-notifications"

  message_retention_duration = var.message_retention_duration

  lifecycle {
    ignore_changes = all
  }
}

resource "google_pubsub_subscription" "email_notifications_subscription" {
  name  = "email-notifications-subscription"
  topic = google_pubsub_topic.email_notifications.name

  ack_deadline_seconds = var.email_notifications_ack_deadline

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "300s"
  }

  enable_message_ordering = false

  push_config {
    push_endpoint = "${var.backend_url}/webhooks/pubsub/email-notifications"

    attributes = {
      "x-goog-version" = "v1"
      "Authorization"  = var.pubsub_webhook_token
    }
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.email_notifications_dlq.id
    max_delivery_attempts = 5
  }

  expiration_policy {
    ttl = "2678400s"
  }
}

resource "google_pubsub_topic" "email_notifications_dlq" {
  name = "email-notifications-dlq"

  labels = {
    purpose = "dead-letter-queue"
  }
}

resource "google_pubsub_subscription" "email_notifications_dlq_subscription" {
  name  = "email-notifications-dlq-subscription"
  topic = google_pubsub_topic.email_notifications_dlq.name

  ack_deadline_seconds = var.dlq_ack_deadline

  message_retention_duration = "604800s"

  retain_acked_messages = true
}

resource "google_pubsub_topic_iam_member" "rag_email_notifications_publisher" {
  count  = var.rag_service_account_email != "" ? 1 : 0
  topic  = google_pubsub_topic.email_notifications.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${var.rag_service_account_email}"
}

resource "google_pubsub_topic_iam_member" "backend_email_notifications_publisher" {
  count  = var.backend_service_account_email != "" ? 1 : 0
  topic  = google_pubsub_topic.email_notifications.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${var.backend_service_account_email}"
}

resource "google_pubsub_topic_iam_member" "email_notifications_dlq_publisher" {
  topic  = google_pubsub_topic.email_notifications_dlq.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}