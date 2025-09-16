terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
  }
}


resource "google_project_service" "scheduler" {
  project = var.project_id
  service = "cloudscheduler.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_cloud_scheduler_job" "scraper_daily" {
  count = var.scraper_url != "" ? 1 : 0

  name      = "scraper-daily"
  region    = var.region
  schedule  = "0 2 * * *"
  time_zone = "UTC"

  description = "Daily NIH grant scraping job"

  http_target {
    uri         = var.scraper_url
    http_method = "POST"

    headers = {
      "Content-Type" = "application/json"
    }

    body = base64encode(jsonencode({
      source   = "cloud-scheduler"
      job_name = "daily-scraper"
    }))

    oidc_token {
      service_account_email = var.scheduler_invoker_service_account_email
      audience              = var.scraper_url
    }
  }

  retry_config {
    retry_count          = 3
    max_retry_duration   = "900s"
    min_backoff_duration = "60s"
    max_backoff_duration = "300s"
    max_doublings        = 3
  }

  depends_on = [google_project_service.scheduler]
}

resource "google_cloud_scheduler_job" "grant_matcher" {
  name      = "grant-matcher-${var.environment}"
  region    = var.region
  schedule  = "0 9 * * *"
  time_zone = "UTC"

  description = "Daily grant matching and notification job"

  http_target {
    uri         = "${var.backend_url}/webhooks/scheduler/grant-matcher"
    http_method = "POST"

    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = var.scheduler_invoker_service_account_email
      audience              = "${var.backend_url}/webhooks/scheduler/grant-matcher"
    }
  }

  retry_config {
    retry_count          = 3
    max_retry_duration   = "900s"
    min_backoff_duration = "60s"
    max_backoff_duration = "300s"
    max_doublings        = 3
  }

  attempt_deadline = "600s"

  depends_on = [google_project_service.scheduler]
}

resource "google_cloud_scheduler_job" "entity_cleanup" {
  name      = "entity-cleanup-${var.environment}"
  region    = var.region
  schedule  = "0 2 * * *"
  time_zone = "UTC"

  description = "Daily cleanup of users and organizations with expired soft deletes"

  http_target {
    uri         = "${var.backend_url}/webhooks/scheduler/entity-cleanup"
    http_method = "POST"

    headers = {
      "Content-Type" = "application/json"
    }

    body = base64encode(jsonencode({
      action    = "cleanup_expired_entities"
      timestamp = "scheduled"
    }))

    oidc_token {
      service_account_email = var.scheduler_invoker_service_account_email
      audience              = "${var.backend_url}/webhooks/scheduler/entity-cleanup"
    }
  }

  retry_config {
    retry_count          = 3
    max_retry_duration   = "60s"
    max_backoff_duration = "30s"
    min_backoff_duration = "5s"
  }

  attempt_deadline = "600s"

  depends_on = [google_project_service.scheduler]
}