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
  name     = "backend"
  location = var.region

  template {
    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/backend:latest"

      resources {
        limits = {
          cpu    = "1000m"
          memory = "2Gi"
        }
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
        name = "LLM_SERVICE_ACCOUNT_CREDENTIALS"
        value_source {
          secret_key_ref {
            secret  = "LLM_SERVICE_ACCOUNT_CREDENTIALS"
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
        name = "ANTHROPIC_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "ANTHROPIC_API_KEY"
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
      max_instance_count = 10
      min_instance_count = 0
    }

    timeout = "300s"
  }

  ingress = "INGRESS_TRAFFIC_ALL"
}

# Crawler service deployment
resource "google_cloud_run_v2_service" "crawler" {
  name     = "crawler"
  location = var.region

  template {
    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/crawler:latest"

      resources {
        limits = {
          cpu    = "1000m"
          memory = "1Gi"
        }
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = "grantflow"
      }

      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = "us-central1"
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
}

# Indexer service deployment
resource "google_cloud_run_v2_service" "indexer" {
  name     = "indexer"
  location = var.region

  template {
    containers {
      image = "us-east1-docker.pkg.dev/${var.project_id}/grantflow/indexer:latest"

      resources {
        limits = {
          cpu    = "1000m"
          memory = "1Gi"
        }
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = "grantflow"
      }

      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = "us-central1"
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
}
