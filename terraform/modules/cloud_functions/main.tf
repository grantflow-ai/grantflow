terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
  }
}

resource "google_project_service" "cloudfunctions" {
  project = var.project_id
  service = "cloudfunctions.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_project_service" "cloudbuild" {
  project = var.project_id
  service = "cloudbuild.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_storage_bucket" "function_source" {
  name     = "${var.project_id}-functions-source-${var.environment}"
  location = var.region
  project  = var.project_id

  uniform_bucket_level_access = true
  force_destroy               = true

  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_service_account" "dlq_manager" {
  project      = var.project_id
  account_id   = "dlq-manager-${var.environment}"
  display_name = "DLQ Manager Service Account"
  description  = "Service account for DLQ Manager Cloud Function"
}

resource "google_project_iam_member" "dlq_manager_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.dlq_manager.email}"
}

resource "google_project_iam_member" "dlq_manager_pubsub_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.dlq_manager.email}"
}

resource "google_project_iam_member" "dlq_manager_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.dlq_manager.email}"
}

resource "google_project_iam_member" "dlq_manager_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.dlq_manager.email}"
}

resource "google_cloudfunctions2_function" "dlq_manager" {
  name        = "dlq-manager-${var.environment}"
  location    = var.region
  project     = var.project_id
  description = "DLQ Manager - reconciles stuck jobs and monitors DLQs"

  build_config {
    runtime     = "python313"
    entry_point = "handle_dlq_reconciliation"

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.dlq_manager_source.name
      }
    }
  }

  service_config {
    max_instance_count               = 1
    min_instance_count               = 0
    available_memory                 = "512M"
    timeout_seconds                  = 540
    max_instance_request_concurrency = 1
    ingress_settings                 = "ALLOW_INTERNAL_ONLY"
    service_account_email            = google_service_account.dlq_manager.email

    environment_variables = {
      GCP_PROJECT_ID = var.project_id
      ENVIRONMENT    = var.environment
    }

    secret_environment_variables {
      key        = "DATABASE_URL"
      project_id = var.project_id
      secret     = "DATABASE_CONNECTION_STRING"
      version    = "latest"
    }
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_storage_bucket.function_source,
  ]
}

resource "google_storage_bucket_object" "dlq_manager_source" {
  name   = "dlq-manager-${var.environment}-${data.archive_file.dlq_manager_source.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.dlq_manager_source.output_path
}

data "archive_file" "dlq_manager_source" {
  type        = "zip"
  output_path = "${path.module}/.terraform/dlq-manager-source.zip"

  source_dir = "${path.root}/../../../functions/dlq_manager"

  excludes = [
    "__pycache__",
    "*.pyc",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "tests",
    "*_test.py",
  ]
}

resource "google_cloudfunctions2_function_iam_member" "dlq_manager_invoker" {
  project        = var.project_id
  location       = var.region
  cloud_function = google_cloudfunctions2_function.dlq_manager.name
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${var.scheduler_invoker_service_account_email}"
}