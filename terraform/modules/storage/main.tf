terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }
}

resource "google_storage_bucket" "uploads" {
  name                        = var.bucket_name
  location                    = var.location
  force_destroy               = false
  storage_class               = var.storage_class
  uniform_bucket_level_access = var.uniform_bucket_access
  public_access_prevention    = "enforced"

  cors {
    origin          = var.environment == "staging" ? ["http://localhost:*", "https://staging--grantflow-staging.us-central1.hosted.app", "https://staging.grantflow.ai"] : ["http://localhost:*", "https://grantflow.ai", "https://www.grantflow.ai"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  dynamic "versioning" {
    for_each = var.enable_versioning ? [1] : []
    content {
      enabled = true
    }
  }

  soft_delete_policy {
    retention_duration_seconds = 604800
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.bucket_key.id
  }

  dynamic "lifecycle_rule" {
    for_each = var.enable_lifecycle ? [1] : []
    content {
      condition {
        age = var.retention_days
      }
      action {
        type = "Delete"
      }
    }
  }

  labels = {
    environment = var.environment
  }
}

resource "google_kms_key_ring" "storage_keyring" {
  name     = "storage-keyring"
  location = var.location == "US" ? "us" : var.location
}

resource "google_kms_crypto_key" "bucket_key" {
  name     = "storage-bucket-key"
  key_ring = google_kms_key_ring.storage_keyring.id

  lifecycle {
    prevent_destroy = true
  }
}


resource "google_storage_bucket_iam_policy" "uploads" {
  bucket      = google_storage_bucket.uploads.name
  policy_data = <<POLICY
{
  "bindings": [
    {
      "members": [
        "projectEditor:grantflow",
        "projectOwner:grantflow"
      ],
      "role": "roles/storage.legacyBucketOwner"
    },
    {
      "members": [
        "projectViewer:grantflow"
      ],
      "role": "roles/storage.legacyBucketReader"
    },
    {
      "members": [
        "projectEditor:grantflow",
        "projectOwner:grantflow"
      ],
      "role": "roles/storage.legacyObjectOwner"
    },
    {
      "members": [
        "projectViewer:grantflow"
      ],
      "role": "roles/storage.legacyObjectReader"
    }
  ]
}
POLICY
}


data "google_storage_project_service_account" "gcs_account" {
  provider = google-beta
}


resource "google_pubsub_topic_iam_binding" "gcs_pubsub_publish" {
  provider = google-beta
  topic    = var.file_indexing_topic
  role     = "roles/pubsub.publisher"
  members  = ["serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}"]
}


resource "google_storage_notification" "file_indexing_notification" {
  provider       = google-beta
  bucket         = google_storage_bucket.uploads.name
  payload_format = "JSON_API_V1"
  topic          = var.file_indexing_topic
  event_types    = ["OBJECT_FINALIZE"]


  custom_attributes = {
    event = "file-created"
  }

  depends_on = [google_pubsub_topic_iam_binding.gcs_pubsub_publish]
}

resource "google_storage_bucket" "scraper" {
  name                        = "grantflow-scraper-${var.environment}"
  location                    = var.location
  force_destroy               = false
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  soft_delete_policy {
    retention_duration_seconds = 604800
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.bucket_key.id
  }

  labels = {
    environment = var.environment
    service     = "scraper"
    purpose     = "nih-grants"
  }
}

resource "google_storage_bucket_iam_member" "scraper_bucket_object_viewer" {
  bucket = google_storage_bucket.scraper.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:scraper-service@grantflow.iam.gserviceaccount.com"
}

resource "google_storage_bucket_iam_member" "scraper_bucket_object_creator" {
  bucket = google_storage_bucket.scraper.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:scraper-service@grantflow.iam.gserviceaccount.com"
}