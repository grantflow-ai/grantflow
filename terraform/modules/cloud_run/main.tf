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


# Backend service deployment
resource "google_cloud_run_v2_service" "backend" {
  name                = "backend"
  location            = var.region
  deletion_protection = false

  template {
    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/backend:latest"

      resources {
        limits = {
          cpu    = "1000m"
          memory = "2Gi"
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
        value = "grantflow"
      }

      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = "us-central1"
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = "grantflow-uploads"
      }

      # Database connection name for the Cloud SQL Auth Proxy
      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = var.database_connection_name
      }

      # Secret env variables
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

      # Mount the Cloud SQL volume
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    # Define the Cloud SQL volume
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.database_connection_name]
      }
    }

    scaling {
      max_instance_count = 10
      min_instance_count = 0
    }

    timeout = "300s"
  }

  ingress = "INGRESS_TRAFFIC_ALL"
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# Crawler service deployment
resource "google_cloud_run_v2_service" "crawler" {
  name                = "crawler"
  location            = var.region
  deletion_protection = false

  template {
    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/crawler:latest"

      resources {
        limits = {
          cpu    = "1000m"
          memory = "1Gi"
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
        value = "grantflow"
      }

      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = "us-central1"
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = "grantflow-uploads"
      }

      # Database connection name for the Cloud SQL Auth Proxy
      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = var.database_connection_name
      }

      # Secret env variables
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

      # Mount the Cloud SQL volume
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    # Define the Cloud SQL volume
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.database_connection_name]
      }
    }

    scaling {
      max_instance_count = 5
      min_instance_count = 0
    }

    timeout = "300s"
  }

  ingress = "INGRESS_TRAFFIC_ALL"
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# Indexer service deployment
resource "google_cloud_run_v2_service" "indexer" {
  name                = "indexer"
  location            = var.region
  deletion_protection = false

  template {
    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/indexer:latest"

      resources {
        limits = {
          cpu    = "1000m"
          memory = "1Gi"
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
        value = "grantflow"
      }

      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = "us-central1"
      }

      env {
        name  = "GCS_BUCKET_NAME"
        value = "grantflow-uploads"
      }

      # Database connection name for the Cloud SQL Auth Proxy
      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = var.database_connection_name
      }

      # Secret env variables
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

      # Mount the Cloud SQL volume
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    # Define the Cloud SQL volume
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.database_connection_name]
      }
    }

    scaling {
      max_instance_count = 5
      min_instance_count = 0
    }

    timeout = "300s"
  }

  ingress = "INGRESS_TRAFFIC_ALL"
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# RAG service deployment
resource "google_cloud_run_v2_service" "rag" {
  name                = "rag"
  location            = var.region
  deletion_protection = false

  template {
    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/rag:latest"

      resources {
        limits = {
          cpu    = "2000m"
          memory = "4Gi"
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
        value = "grantflow"
      }

      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = "us-central1"
      }

      env {
        name  = "FRONTEND_NOTIFICATIONS_PUBSUB_TOPIC"
        value = "frontend-notifications"
      }

      # Database connection name for the Cloud SQL Auth Proxy
      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = var.database_connection_name
      }

      # Secret env variables
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

      # Mount the Cloud SQL volume
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    # Define the Cloud SQL volume
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.database_connection_name]
      }
    }

    scaling {
      max_instance_count = 5
      min_instance_count = 0
    }

    timeout = "1800s" # 30 minutes for long-running RAG tasks
  }

  ingress = "INGRESS_TRAFFIC_ALL"
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# Create a service account for the Pub/Sub subscription to invoke the indexer
resource "google_service_account" "pubsub_invoker" {
  account_id   = "pubsub-invoker"
  display_name = "Pub/Sub Invoker Service Account"
  description  = "Service account for Pub/Sub to invoke the indexer service"
}

# Allow Pub/Sub to create authentication tokens specifically for this service account
resource "google_service_account_iam_member" "pubsub_token_creator" {
  service_account_id = google_service_account.pubsub_invoker.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:service-${data.google_project.project.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

# Allow the Pub/Sub service account to invoke the indexer service
resource "google_cloud_run_v2_service_iam_member" "pubsub_invoker_indexer" {
  location = var.region
  name     = google_cloud_run_v2_service.indexer.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}

# Allow the Pub/Sub service account to invoke the crawler service
resource "google_cloud_run_v2_service_iam_member" "pubsub_invoker_crawler" {
  location = var.region
  name     = google_cloud_run_v2_service.crawler.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}

# Allow the Pub/Sub service account to invoke the RAG service
resource "google_cloud_run_v2_service_iam_member" "pubsub_invoker_rag" {
  location = var.region
  name     = google_cloud_run_v2_service.rag.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.pubsub_invoker.email}"
}

# Data source for project information
data "google_project" "project" {}

# Output the service account email for PubSub
output "pubsub_invoker_service_account_email" {
  value       = google_service_account.pubsub_invoker.email
  description = "Email address of the service account used for Pub/Sub to invoke Cloud Run"
}
