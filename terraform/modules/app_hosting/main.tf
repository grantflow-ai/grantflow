
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.14.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 6.14.0"
    }
  }
}

locals {
  backend_id            = var.backend_id != "" ? var.backend_id : var.environment
  service_account_base  = "${var.project_id}-${local.backend_id}-apphosting"
  service_account_trunc = substr(local.service_account_base, 0, 30)
  service_account_id    = trim(local.service_account_trunc, "-")
}

resource "google_project_service" "firebase" {
  project = var.project_id
  service = "firebase.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "firebase_app_hosting" {
  project = var.project_id
  service = "firebaseapphosting.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "service_usage" {
  project = var.project_id
  service = "serviceusage.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "cloud_resource_manager" {
  project = var.project_id
  service = "cloudresourcemanager.googleapis.com"

  disable_on_destroy = false
}

resource "google_firebase_app_hosting_backend" "frontend" {
  provider   = google-beta
  project    = var.project_id
  location   = var.region
  backend_id = local.backend_id

  app_id = var.firebase_app_id

  service_account = google_service_account.app_hosting.email

  serving_locality = "GLOBAL_ACCESS"

  depends_on = [
    google_project_service.firebase,
    google_project_service.firebase_app_hosting,
    google_project_service.service_usage,
    google_project_service.cloud_resource_manager
  ]
}

resource "google_service_account" "app_hosting" {
  project      = var.project_id
  account_id   = local.service_account_id
  display_name = "Firebase App Hosting Service Account (${local.backend_id})"
}

resource "google_project_iam_member" "app_hosting_compute_viewer" {
  project = var.project_id
  role    = "roles/compute.viewer"
  member  = "serviceAccount:${google_service_account.app_hosting.email}"
}

resource "google_project_iam_member" "app_hosting_storage_viewer" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.app_hosting.email}"
}

resource "google_project_iam_member" "app_hosting_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.app_hosting.email}"
}

resource "google_secret_manager_secret_iam_member" "app_hosting_secret_access" {
  for_each = toset(var.secret_ids)

  project   = var.project_id
  secret_id = each.key
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app_hosting.email}"
}

resource "google_firebase_app_hosting_build" "frontend" {
  provider = google-beta
  project  = google_firebase_app_hosting_backend.frontend.project
  location = google_firebase_app_hosting_backend.frontend.location
  backend  = google_firebase_app_hosting_backend.frontend.backend_id
  build_id = substr("${local.backend_id}-${formatdate("MMDDhhmm", timestamp())}", 0, 30)

  source {
    container {
      # Use digest if provided (from CI/CD), otherwise fall back to tag
      image = var.image_digest != "" ? "us-east1-docker.pkg.dev/${var.project_id}/grantflow/frontend@${var.image_digest}" : "us-east1-docker.pkg.dev/${var.project_id}/grantflow/frontend:${var.image_tag}"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_firebase_app_hosting_traffic" "frontend" {
  provider = google-beta
  project  = google_firebase_app_hosting_backend.frontend.project
  location = google_firebase_app_hosting_backend.frontend.location
  backend  = google_firebase_app_hosting_backend.frontend.backend_id

  target {
    splits {
      build   = google_firebase_app_hosting_build.frontend.name
      percent = 100
    }
  }
}
