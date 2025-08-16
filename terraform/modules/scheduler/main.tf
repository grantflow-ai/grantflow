terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
  }
}

variable "project_id" {
  description = "The project ID to deploy to"
  type        = string
}

variable "region" {
  description = "The region for the Cloud Scheduler job"
  type        = string
  default     = "us-central1"
}

variable "scraper_url" {
  description = "The URL of the scraper Cloud Run service"
  type        = string
}

variable "scheduler_invoker_service_account_email" {
  description = "Email of the service account used by Cloud Scheduler"
  type        = string
}

variable "environment" {
  description = "Environment (staging, prod)"
  type        = string
  default     = "staging"
}

variable "timezone" {
  description = "Timezone for scheduled jobs"
  type        = string
  default     = "Europe/Berlin"
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