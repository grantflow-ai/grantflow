terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.14.0"
    }
  }
}

resource "google_service_account" "pubsub_invoker" {
  account_id   = "pubsub-invoker"
  display_name = "Pub/Sub Cloud Run Invoker"
  project      = var.project_id
}

resource "google_service_account" "scheduler_invoker" {
  account_id   = "scheduler-invoker"
  display_name = "Cloud Scheduler Invoker"
  project      = var.project_id
}

resource "google_service_account" "firebase_admin_sdk" {
  account_id   = "firebase-adminsdk-skwn4"
  display_name = "Firebase Admin SDK Service Account"
  project      = var.project_id
}

resource "google_service_account" "firebase_app_hosting_compute" {
  account_id   = "firebase-app-hosting-compute"
  display_name = "Firebase App Hosting compute service account"
  project      = var.project_id
}

resource "google_service_account" "grantflow_staging_apphosting" {
  account_id   = "grantflow-staging-apphosting"
  display_name = "Firebase App Hosting Service Account (staging)"
  project      = var.project_id
}

resource "google_cloud_run_v2_service" "production_frontend" {
  name     = "monorepo"
  location = "us-central1"
  project  = var.project_id

  template {
    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"

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

  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }
}

resource "google_cloud_run_v2_service" "staging_frontend" {
  name     = "staging"
  location = "us-central1"
  project  = var.project_id

  template {
    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"

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

  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }
}

resource "google_cloud_run_v2_service_iam_member" "production_frontend_public" {
  name     = google_cloud_run_v2_service.production_frontend.name
  location = google_cloud_run_v2_service.production_frontend.location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "staging_frontend_public" {
  name     = google_cloud_run_v2_service.staging_frontend.name
  location = google_cloud_run_v2_service.staging_frontend.location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service" "before_create" {
  name     = "before-create"
  location = "us-central1"
  project  = var.project_id

  template {
    containers {
      image = "us-central1-docker.pkg.dev/grantflow/gcf-artifacts/grantflow__us--central1__before__sign__in:version_1"

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

    service_account = google_service_account.firebase_admin_sdk.email
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  lifecycle {
    ignore_changes = all
  }
}

resource "google_cloud_run_v2_service" "before_sign_in" {
  name     = "before-sign-in"
  location = "us-central1"
  project  = var.project_id

  template {
    containers {
      image = "us-central1-docker.pkg.dev/grantflow/gcf-artifacts/grantflow__us--central1__before__sign__in:version_1"

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

    service_account = google_service_account.firebase_admin_sdk.email
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  lifecycle {
    ignore_changes = all
  }
}