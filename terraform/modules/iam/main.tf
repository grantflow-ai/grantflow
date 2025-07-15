terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}


resource "google_service_account" "github_actions" {
  account_id   = "githubactions"
  display_name = "GitHub Actions Service Account"
  description  = "Service account for GitHub Actions CI/CD"

  lifecycle {
    ignore_changes = all
  }
}


resource "google_service_account" "cloud_storage_admin" {
  account_id   = "cloud-storage-admin"
  display_name = "Cloud Storage Admin"
  description  = "Service account for managing Cloud Storage"

  lifecycle {
    ignore_changes = all
  }
}


resource "google_service_account" "llm_api_service_account" {
  account_id   = "llm-api-service-account"
  display_name = "LLM API Service Account"
  description  = "Service account for accessing LLM APIs"

  lifecycle {
    ignore_changes = all
  }
}


resource "google_project_iam_member" "github_actions_workload_identity_user" {
  project = "grantflow"
  role    = "roles/iam.workloadIdentityUser"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "github_actions_artifact_registry_writer" {
  project = "grantflow"
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}


resource "google_service_account_iam_member" "github_actions_service_account_user" {
  service_account_id = google_service_account.cloud_storage_admin.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_service_account_iam_member" "github_actions_token_creator" {
  service_account_id = google_service_account.cloud_storage_admin.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.github_actions.email}"
}


resource "google_project_iam_member" "storage_admin" {
  project = "grantflow"
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.cloud_storage_admin.email}"
}

resource "google_project_iam_member" "storage_object_user" {
  project = "grantflow"
  role    = "roles/storage.objectUser"
  member  = "serviceAccount:${google_service_account.cloud_storage_admin.email}"
}


resource "google_project_iam_member" "aiplatform_user" {
  project = "grantflow"
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.llm_api_service_account.email}"
}


resource "google_project_iam_member" "owners_group" {
  project = "grantflow"
  role    = "roles/owner"
  member  = "group:admin@grantflow.ai"
}


resource "google_service_account" "backend" {
  account_id   = "backend-service"
  display_name = "Backend Service Account"
  description  = "Service account for the backend Cloud Run service"
}


resource "google_project_iam_member" "backend_firebase_admin" {
  project = "grantflow"
  role    = "roles/firebase.admin"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_firebase_viewer" {
  project = "grantflow"
  role    = "roles/firebase.viewer"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_cloudsql_client" {
  project = "grantflow"
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_pubsub_publisher" {
  project = "grantflow"
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_storage_object_viewer" {
  project = "grantflow"
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_storage_object_creator" {
  project = "grantflow"
  role    = "roles/storage.objectCreator"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_secret_accessor" {
  project = "grantflow"
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_logging_writer" {
  project = "grantflow"
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_monitoring_metric_writer" {
  project = "grantflow"
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_trace_agent" {
  project = "grantflow"
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_identitytoolkit_admin" {
  project = "grantflow"
  role    = "roles/identitytoolkit.admin"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_serviceusage_consumer" {
  project = "grantflow"
  role    = "roles/serviceusage.serviceUsageConsumer"
  member  = "serviceAccount:${google_service_account.backend.email}"
}



