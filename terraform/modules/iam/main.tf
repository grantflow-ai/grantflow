# Service accounts for GitHub Actions
resource "google_service_account" "github_actions" {
  account_id   = "githubactions"
  display_name = "GitHub Actions Service Account"
  description  = "Service account for GitHub Actions CI/CD"
}

# Service account for Cloud Storage
resource "google_service_account" "cloud_storage_admin" {
  account_id   = "cloud-storage-admin"
  display_name = "Cloud Storage Admin"
  description  = "Service account for managing Cloud Storage"
}

# Service account for LLM API
resource "google_service_account" "llm_api_service_account" {
  account_id   = "llm-api-service-account"
  display_name = "LLM API Service Account"
  description  = "Service account for accessing LLM APIs"
}

# IAM bindings for GitHub Actions service account
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

resource "google_project_iam_member" "github_actions_service_account_user" {
  project = "grantflow"
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_project_iam_member" "github_actions_token_creator" {
  project = "grantflow"
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# IAM bindings for Cloud Storage admin service account
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

# IAM bindings for LLM API service account
resource "google_project_iam_member" "aiplatform_user" {
  project = "grantflow"
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.llm_api_service_account.email}"
}

# Project owners
resource "google_project_iam_member" "owner_naaman" {
  project = "grantflow"
  role    = "roles/owner"
  member  = "user:naaman@grantflow.ai"
}

resource "google_project_iam_member" "owner_asaf" {
  project = "grantflow"
  role    = "roles/owner"
  member  = "user:asaf@grantflow.ai"
}

resource "google_project_iam_member" "owner_varun" {
  project = "grantflow"
  role    = "roles/owner"
  member  = "user:varun@grantflow.ai"
}
