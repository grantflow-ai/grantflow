terraform {
  required_version = ">= 1.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.14.0"
    }
  }
}

resource "google_artifact_registry_repository" "main" {
  project       = var.project_id
  location      = var.location
  repository_id = var.repository_name
  description   = "Docker repository for ${var.repository_name}"
  format        = "DOCKER"

  cleanup_policies {
    id     = "delete-old-images"
    action = "DELETE"

    condition {
      tag_state  = "ANY"
      older_than = "${var.retention_days * 24}h"
    }
  }

  cleanup_policies {
    id     = "keep-tagged-releases"
    action = "KEEP"

    condition {
      tag_prefixes = var.keep_tag_prefixes
    }
  }

  cleanup_policies {
    id     = "keep-recent-images"
    action = "KEEP"

    most_recent_versions {
      keep_count = var.keep_recent_count
    }
  }

  docker_config {
    immutable_tags = false
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_artifact_registry_repository_iam_member" "cloud_run_reader" {
  for_each = toset(var.reader_service_accounts)

  project    = google_artifact_registry_repository.main.project
  location   = google_artifact_registry_repository.main.location
  repository = google_artifact_registry_repository.main.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${each.value}"
}

resource "google_artifact_registry_repository_iam_member" "ci_writer" {
  project    = google_artifact_registry_repository.main.project
  location   = google_artifact_registry_repository.main.location
  repository = google_artifact_registry_repository.main.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${var.ci_service_account}"
}
