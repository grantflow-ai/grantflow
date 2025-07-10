terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

data "google_project" "project" {
  project_id = var.project_id
}


resource "google_secret_manager_secret" "database_connection_string" {
  secret_id = "DATABASE_CONNECTION_STRING"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "firebase_service_account_credentials" {
  secret_id = "FIREBASE_SERVICE_ACCOUNT_CREDENTIALS"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "llm_service_account_credentials" {
  secret_id = "LLM_SERVICE_ACCOUNT_CREDENTIALS"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "JWT_SECRET"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "admin_access_code" {
  secret_id = "ADMIN_ACCESS_CODE"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "anthropic_api_key" {
  secret_id = "ANTHROPIC_API_KEY"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "google_ai_api_key" {
  secret_id = "GOOGLE_AI_API_KEY"
  project   = var.project_id

  replication {
    auto {}
  }
}


resource "google_secret_manager_secret" "gcs_service_account_credentials" {
  secret_id = "GCS_SERVICE_ACCOUNT_CREDENTIALS"
  project   = var.project_id

  replication {
    auto {}
  }
}


resource "google_kms_key_ring" "secrets_keyring" {
  name     = "secrets-keyring"
  location = "global"
  project  = var.project_id
}

resource "google_kms_crypto_key" "secrets_key" {
  name     = "secrets-key"
  key_ring = google_kms_key_ring.secrets_keyring.id

  lifecycle {
    prevent_destroy = true
  }
}





resource "google_secret_manager_secret_iam_binding" "database_connection_string_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.database_connection_string.secret_id
  role      = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
  ]
}


resource "google_secret_manager_secret_iam_binding" "firebase_credentials_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.firebase_service_account_credentials.secret_id
  role      = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
  ]
}


resource "google_secret_manager_secret_iam_binding" "llm_credentials_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.llm_service_account_credentials.secret_id
  role      = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
  ]
}


resource "google_secret_manager_secret_iam_binding" "jwt_secret_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.jwt_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
  ]
}


resource "google_secret_manager_secret_iam_binding" "admin_access_code_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.admin_access_code.secret_id
  role      = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
  ]
}


resource "google_secret_manager_secret_iam_binding" "anthropic_api_key_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.anthropic_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
  ]
}

resource "google_secret_manager_secret_iam_binding" "google_ai_api_key_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.google_ai_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
  ]
}


resource "google_secret_manager_secret_iam_binding" "gcs_credentials_access" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.gcs_service_account_credentials.secret_id
  role      = "roles/secretmanager.secretAccessor"
  members = [
    "serviceAccount:${var.project_id}@appspot.gserviceaccount.com",
    "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  ]
}