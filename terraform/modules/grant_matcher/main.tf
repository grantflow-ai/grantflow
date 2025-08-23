resource "google_storage_bucket" "grant_matcher_functions" {
  name     = "${var.project_id}-grant-matcher-functions-${var.environment}"
  location = var.region

  uniform_bucket_level_access = true
  force_destroy               = var.environment != "production"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

data "archive_file" "grant_matcher_source" {
  type        = "zip"
  output_path = "/tmp/grant-matcher-function.zip"

  source {
    content  = file("${path.root}/../cloud_functions/src/grant_matcher/__init__.py")
    filename = "__init__.py"
  }

  source {
    content  = file("${path.root}/../cloud_functions/src/grant_matcher/main.py")
    filename = "main.py"
  }

  source {
    content  = file("${path.root}/../cloud_functions/requirements.txt")
    filename = "requirements.txt"
  }
}

resource "google_storage_bucket_object" "grant_matcher_source" {
  name   = "grant-matcher-function-${data.archive_file.grant_matcher_source.output_md5}.zip"
  bucket = google_storage_bucket.grant_matcher_functions.name
  source = data.archive_file.grant_matcher_source.output_path
}

resource "google_cloudfunctions2_function" "grant_matcher" {
  name        = "fn-grant-matcher-${var.environment}"
  location    = var.region
  description = "Matches grants with user subscriptions and sends notifications"

  build_config {
    runtime     = "python313"
    entry_point = "match_grants"

    source {
      storage_source {
        bucket = google_storage_bucket.grant_matcher_functions.name
        object = google_storage_bucket_object.grant_matcher_source.name
      }
    }
  }

  service_config {
    max_instance_count = 10
    min_instance_count = 0
    available_memory   = "512Mi"
    timeout_seconds    = 540
    environment_variables = {
      GCP_PROJECT_ID = var.project_id
      ENVIRONMENT    = var.environment
    }
    service_account_email          = google_service_account.grant_matcher_sa.email
    ingress_settings               = "ALLOW_INTERNAL_ONLY"
    all_traffic_on_latest_revision = true
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_service.artifactregistry,
  ]
}

resource "google_service_account" "grant_matcher_sa" {
  account_id   = "grant-matcher-${var.environment}"
  display_name = "Grant Matcher Function Service Account"
  description  = "Service account for grant matcher cloud function"
}

resource "google_project_iam_member" "grant_matcher_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.grant_matcher_sa.email}"
}

resource "google_project_iam_member" "grant_matcher_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.grant_matcher_sa.email}"
}

resource "google_cloud_scheduler_job" "grant_matcher_invoker" {
  name             = "grant-matcher-scheduler-${var.environment}"
  description      = "Invoke grant matcher function daily"
  schedule         = "0 9 * * *"
  time_zone        = "UTC"
  attempt_deadline = "600s"

  http_target {
    uri         = google_cloudfunctions2_function.grant_matcher.service_config[0].uri
    http_method = "POST"
    headers = {
      "X-CloudScheduler" = "true"
    }

    oidc_token {
      service_account_email = google_service_account.grant_matcher_sa.email
      audience              = google_cloudfunctions2_function.grant_matcher.service_config[0].uri
    }
  }

  depends_on = [google_cloudfunctions2_function.grant_matcher]
}

resource "google_cloudfunctions2_function_iam_member" "grant_matcher_invoker" {
  cloud_function = google_cloudfunctions2_function.grant_matcher.name
  location       = google_cloudfunctions2_function.grant_matcher.location
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${google_service_account.grant_matcher_sa.email}"
}

resource "google_project_service" "cloudfunctions" {
  service            = "cloudfunctions.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

output "grant_matcher_function_uri" {
  value = google_cloudfunctions2_function.grant_matcher.service_config[0].uri
}