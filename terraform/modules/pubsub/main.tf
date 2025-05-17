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
}

# Optional: Add subscription if needed
resource "google_pubsub_subscription" "file_indexing_subscription" {
  name  = "file-indexing-subscription"
  topic = google_pubsub_topic.file_indexing.name

  ack_deadline_seconds = 20

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  enable_message_ordering = false
}
