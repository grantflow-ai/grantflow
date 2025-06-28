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


resource "google_pubsub_subscription" "file_indexing_subscription" {
  name  = "file-indexing-subscription"
  topic = google_pubsub_topic.file_indexing.name

  ack_deadline_seconds = 60

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  enable_message_ordering = false

  
  push_config {
    push_endpoint = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/services/indexer:call"

    
    oidc_token {
      service_account_email = var.pubsub_invoker_service_account_email
      audience              = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/services/indexer"
    }

    
    attributes = {
      "x-goog-version" = "v1"
    }
  }

  
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.file_indexing_dlq.id
    max_delivery_attempts = 5
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

  ack_deadline_seconds = 60

  
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

  ack_deadline_seconds = 60

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  enable_message_ordering = false

  
  push_config {
    push_endpoint = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/services/crawler:call"

    
    oidc_token {
      service_account_email = var.pubsub_invoker_service_account_email
      audience              = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/services/crawler"
    }

    
    attributes = {
      "x-goog-version" = "v1"
    }
  }

  
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.url_crawling_dlq.id
    max_delivery_attempts = 5
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

  ack_deadline_seconds = 60

  
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

  ack_deadline_seconds = 600 

  retry_policy {
    minimum_backoff = "30s"
    maximum_backoff = "600s"
  }

  enable_message_ordering = false

  
  push_config {
    push_endpoint = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/services/rag:call"

    
    oidc_token {
      service_account_email = var.pubsub_invoker_service_account_email
      audience              = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/services/rag"
    }

    
    attributes = {
      "x-goog-version" = "v1"
    }
  }

  
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.rag_processing_dlq.id
    max_delivery_attempts = 3 
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

  ack_deadline_seconds = 60

  
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

  lifecycle {
    ignore_changes = all
  }
}

# NOTE: Subscriptions for frontend-notifications are created dynamically



resource "google_pubsub_topic_iam_member" "frontend_notifications_publisher" {
  topic  = google_pubsub_topic.frontend_notifications.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
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
