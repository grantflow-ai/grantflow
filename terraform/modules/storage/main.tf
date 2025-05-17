terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

variable "bucket_name" {
  description = "The name of the storage bucket"
  type        = string
  default     = "grantflow-uploads"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

resource "google_storage_bucket" "uploads" {
  name                        = var.bucket_name
  location                    = "US"
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
  }
}

resource "google_kms_key_ring" "storage_keyring" {
  name     = "storage-keyring"
  location = "us"
}

resource "google_kms_crypto_key" "bucket_key" {
  name     = "storage-bucket-key"
  key_ring = google_kms_key_ring.storage_keyring.id

  lifecycle {
    prevent_destroy = true
  }
}

# IAM for the storage bucket
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
