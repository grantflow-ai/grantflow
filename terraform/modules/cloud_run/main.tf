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
  description = "The region for the Cloud Run service"
  type        = string
  default     = "us-central1"
}

variable "database_connection_name" {
  description = "The connection name of the Cloud SQL instance"
  type        = string
}

variable "environment" {
  description = "Environment (staging, prod)"
  type        = string
  default     = "staging"
}

variable "discord_webhook_url" {
  description = "Discord webhook URL for notifications"
  type        = string
  default     = ""
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "cpu_limit" {
  description = "CPU allocation for Cloud Run containers"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Memory allocation for Cloud Run containers"
  type        = string
  default     = "1Gi"
}

variable "enable_cpu_throttling" {
  description = "Enable CPU throttling"
  type        = bool
  default     = true
}

variable "enable_http2" {
  description = "Enable HTTP/2"
  type        = bool
  default     = false
}

variable "request_timeout" {
  description = "Request timeout in seconds"
  type        = number
  default     = 300
}

variable "concurrency_limit" {
  description = "Maximum number of concurrent requests per instance"
  type        = number
  default     = 80
}



resource "google_cloud_run_v2_service" "backend" {
  name                = "backend"
  location            = var.region
  deletion_protection = false

  template {
    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/backend:latest"

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
      }

      ports {
        container_port = 8000
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 15
        failure_threshold     = 3
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = "us-central1"
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = "grantflow-staging-uploads"
      }


      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = var.database_connection_name
      }


      env {
        name = "DATABASE_CONNECTION_STRING"
        value_source {
          secret_key_ref {
            secret  = "DATABASE_CONNECTION_STRING"
            version = "latest"
          }
        }
      }

      env {
        name = "FIREBASE_SERVICE_ACCOUNT_CREDENTIALS"
        value_source {
          secret_key_ref {
            secret  = "FIREBASE_SERVICE_ACCOUNT_CREDENTIALS"
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = "JWT_SECRET"
            version = "latest"
          }
        }
      }

      env {
        name = "ADMIN_ACCESS_CODE"
        value_source {
          secret_key_ref {
            secret  = "ADMIN_ACCESS_CODE"
            version = "latest"
          }
        }
      }

      env {
        name = "GCS_SERVICE_ACCOUNT_CREDENTIALS"
        value_source {
          secret_key_ref {
            secret  = "GCS_SERVICE_ACCOUNT_CREDENTIALS"
            version = "latest"
          }
        }
      }

      env {
        name  = "URL_CRAWLING_PUBSUB_TOPIC"
        value = "url-crawling"
      }

      env {
        name  = "RAG_PROCESSING_PUBSUB_TOPIC"
        value = "rag-processing"
      }


      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }


    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.database_connection_name]
      }
    }

    scaling {
      max_instance_count = var.max_instances
      min_instance_count = var.min_instances
    }

    timeout         = "${var.request_timeout}s"
    max_instance_request_concurrency = var.concurrency_limit
  }

  ingress = "INGRESS_TRAFFIC_ALL"
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}


resource "google_cloud_run_v2_service" "crawler" {
  name                = "crawler"
  location            = var.region
  deletion_protection = false

  template {
    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/crawler:latest"

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
      }

      ports {
        container_port = 8000
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 15
        failure_threshold     = 3
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = "us-central1"
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = "grantflow-staging-uploads"
      }


      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = var.database_connection_name
      }


      env {
        name = "DATABASE_CONNECTION_STRING"
        value_source {
          secret_key_ref {
            secret  = "DATABASE_CONNECTION_STRING"
            version = "latest"
          }
        }
      }

      env {
        name = "GCS_SERVICE_ACCOUNT_CREDENTIALS"
        value_source {
          secret_key_ref {
            secret  = "GCS_SERVICE_ACCOUNT_CREDENTIALS"
            version = "latest"
          }
        }
      }


      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }


    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.database_connection_name]
      }
    }

    scaling {
      max_instance_count = var.max_instances
      min_instance_count = var.min_instances
    }

    timeout         = "${var.request_timeout}s"
    max_instance_request_concurrency = var.concurrency_limit
  }

  ingress = "INGRESS_TRAFFIC_ALL"
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}


resource "google_cloud_run_v2_service" "indexer" {
  name                = "indexer"
  location            = var.region
  deletion_protection = false

  template {
    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/indexer:latest"

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
      }

      ports {
        container_port = 8000
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 15
        failure_threshold     = 3
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = "us-central1"
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = "grantflow-staging-uploads"
      }


      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = var.database_connection_name
      }


      env {
        name = "DATABASE_CONNECTION_STRING"
        value_source {
          secret_key_ref {
            secret  = "DATABASE_CONNECTION_STRING"
            version = "latest"
          }
        }
      }

      env {
        name = "GCS_SERVICE_ACCOUNT_CREDENTIALS"
        value_source {
          secret_key_ref {
            secret  = "GCS_SERVICE_ACCOUNT_CREDENTIALS"
            version = "latest"
          }
        }
      }


      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }


    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.database_connection_name]
      }
    }

    scaling {
      max_instance_count = var.max_instances
      min_instance_count = var.min_instances
    }

    timeout         = "${var.request_timeout}s"
    max_instance_request_concurrency = var.concurrency_limit
  }

  ingress = "INGRESS_TRAFFIC_ALL"
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}


resource "google_cloud_run_v2_service" "rag" {
  name                = "rag"
  location            = var.region
  deletion_protection = false

  template {
    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/rag:latest"

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
      }

      ports {
        container_port = 8000
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 15
        failure_threshold     = 3
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = "us-central1"
      }

      env {
        name  = "FRONTEND_NOTIFICATIONS_PUBSUB_TOPIC"
        value = "frontend-notifications"
      }


      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = var.database_connection_name
      }


      env {
        name = "DATABASE_CONNECTION_STRING"
        value_source {
          secret_key_ref {
            secret  = "DATABASE_CONNECTION_STRING"
            version = "latest"
          }
        }
      }

      env {
        name = "LLM_SERVICE_ACCOUNT_CREDENTIALS"
        value_source {
          secret_key_ref {
            secret  = "LLM_SERVICE_ACCOUNT_CREDENTIALS"
            version = "latest"
          }
        }
      }

      env {
        name = "ANTHROPIC_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "ANTHROPIC_API_KEY"
            version = "latest"
          }
        }
      }


      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }


    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.database_connection_name]
      }
    }

    scaling {
      max_instance_count = var.max_instances
      min_instance_count = var.min_instances
    }

    timeout = "1800s"
  }

  ingress = "INGRESS_TRAFFIC_ALL"
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}


resource "google_service_account" "pubsub_invoker" {
  account_id   = "pubsub-invoker"
  display_name = "Pub/Sub Invoker Service Account"
  description  = "Service account for Pub/Sub to invoke the indexer service"
}


resource "google_service_account_iam_member" "pubsub_token_creator" {
  service_account_id = google_service_account.pubsub_invoker.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}


resource "google_cloud_run_v2_service_iam_member" "pubsub_invoker_indexer" {
  location = var.region
  name     = google_cloud_run_v2_service.indexer.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}


resource "google_cloud_run_v2_service_iam_member" "pubsub_invoker_crawler" {
  location = var.region
  name     = google_cloud_run_v2_service.crawler.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}


resource "google_cloud_run_v2_service_iam_member" "pubsub_invoker_rag" {
  location = var.region
  name     = google_cloud_run_v2_service.rag.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}


# Scraper Service - NIH grant scraping with Cloud Scheduler
resource "google_cloud_run_v2_service" "scraper" {
  name                = "scraper"
  location            = var.region
  deletion_protection = false

  template {
    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/scraper:latest"

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
      }

      ports {
        container_port = 8000
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        initial_delay_seconds = 30
        timeout_seconds       = 15
        period_seconds        = 60
        failure_threshold     = 5
      }

      # Standard environment variables
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = "us-central1"
      }

      # Scraper-specific bucket name
      env {
        name  = "SCRAPER_GCS_BUCKET_NAME"
        value = "grantflow-scraper"
      }

      # Environment name
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      # Discord webhook URL for notifications
      env {
        name  = "DISCORD_WEBHOOK_URL"
        value = var.discord_webhook_url
      }

      # Playwright configuration for browser automation
      env {
        name  = "PLAYWRIGHT_BROWSERS_PATH"
        value = "/app/.cache/ms-playwright"
      }

      env {
        name  = "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD"
        value = "0"
      }

      # GCS credentials from Secret Manager
      env {
        name = "GCS_SERVICE_ACCOUNT_CREDENTIALS"
        value_source {
          secret_key_ref {
            secret  = "GCS_SERVICE_ACCOUNT_CREDENTIALS"
            version = "latest"
          }
        }
      }
    }

    scaling {
      max_instance_count = 1 # Only one instance needed - scheduled job, not concurrent
      min_instance_count = 0 # Scale to zero when not in use
    }

    timeout = "3600s" # 60 minutes - browser automation can take significant time
  }

  ingress = "INGRESS_TRAFFIC_ALL"

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# Service account for Cloud Scheduler to invoke scraper
resource "google_service_account" "scheduler_invoker" {
  account_id   = "scheduler-invoker"
  display_name = "Cloud Scheduler Service Account"
  description  = "Service account used by Cloud Scheduler to invoke Cloud Run services"
}

# IAM binding for scheduler to invoke scraper service
resource "google_cloud_run_v2_service_iam_member" "scheduler_invoker_scraper" {
  location = var.region
  name     = google_cloud_run_v2_service.scraper.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler_invoker.email}"
}

data "google_project" "project" {}


output "pubsub_invoker_service_account_email" {
  value       = google_service_account.pubsub_invoker.email
  description = "Email address of the service account used for Pub/Sub to invoke Cloud Run"
}

output "scheduler_invoker_service_account_email" {
  value       = google_service_account.scheduler_invoker.email
  description = "Email address of the service account used for Cloud Scheduler to invoke Cloud Run"
}

output "scraper_url" {
  description = "The URL of the deployed scraper service"
  value       = google_cloud_run_v2_service.scraper.uri
}

output "scraper_service_id" {
  description = "The ID of the scraper service"
  value       = google_cloud_run_v2_service.scraper.name
}