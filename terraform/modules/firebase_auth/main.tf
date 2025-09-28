terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.14.0"
    }
  }
}

resource "google_cloud_run_v2_service" "before_create" {
  name     = "before-create"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.firebase_auth_functions.email

    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/before-create:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 100
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

resource "google_cloud_run_v2_service" "before_sign_in" {
  name     = "before-sign-in"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.firebase_auth_functions.email

    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/before-sign-in:latest"

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 100
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

resource "google_service_account" "firebase_auth_functions" {
  account_id   = "firebase-auth-functions"
  display_name = "Firebase Auth Blocking Functions"
  project      = var.project_id
}

resource "google_project_iam_member" "firebase_auth_functions_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.firebase_auth_functions.email}"
}

resource "google_cloud_run_v2_service_iam_member" "before_create_invoker" {
  name     = google_cloud_run_v2_service.before_create.name
  location = google_cloud_run_v2_service.before_create.location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "before_sign_in_invoker" {
  name     = google_cloud_run_v2_service.before_sign_in.name
  location = google_cloud_run_v2_service.before_sign_in.location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}