# Firebase App Hosting Module
# This module manages Firebase App Hosting backends with custom container support

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

# Enable required APIs
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

# Firebase App Hosting Backend for the frontend application
resource "google_firebase_app_hosting_backend" "frontend" {
  provider   = google-beta
  project    = var.project_id
  location   = var.region
  backend_id = var.environment

  # The Firebase Web App ID
  app_id = var.firebase_app_id

  # Service account for the backend
  service_account = google_service_account.app_hosting.email

  # Global serving configuration
  serving_locality = "GLOBAL_ACCESS"

  depends_on = [
    google_project_service.firebase,
    google_project_service.firebase_app_hosting,
    google_project_service.service_usage,
    google_project_service.cloud_resource_manager
  ]
}

# Service account for App Hosting
resource "google_service_account" "app_hosting" {
  project      = var.project_id
  account_id   = "${var.project_id}-${var.environment}-apphosting"
  display_name = "Firebase App Hosting Service Account (${var.environment})"
}

# Grant necessary permissions to the service account
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

# Allow App Hosting to access secrets
resource "google_secret_manager_secret_iam_member" "app_hosting_secret_access" {
  for_each = toset(var.secret_ids)

  project   = var.project_id
  secret_id = each.key
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app_hosting.email}"
}

# Deploy a build using custom container image
resource "google_firebase_app_hosting_build" "frontend" {
  provider = google-beta
  project  = google_firebase_app_hosting_backend.frontend.project
  location = google_firebase_app_hosting_backend.frontend.location
  backend  = google_firebase_app_hosting_backend.frontend.backend_id
  build_id = "${var.environment}-${var.image_tag}"

  source {
    container {
      # Use the Docker image from Artifact Registry
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/frontend:${var.image_tag}"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Note: Traffic configuration is handled automatically by Firebase App Hosting
# when a new build is created. Custom domains are managed through Firebase Console.