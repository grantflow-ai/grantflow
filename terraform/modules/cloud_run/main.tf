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

resource "google_cloud_run_service" "monorepo" {
  name     = "monorepo"
  location = var.region
  project  = var.project_id

  template {
    spec {
      containers {
        image = "us-central1-docker.pkg.dev/${var.project_id}/firebaseapphosting-images/monorepo:latest"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      # Ignore changes to the image as it's managed by Firebase App Hosting
      template[0].spec[0].containers[0].image,
      metadata[0].annotations,
      template[0].metadata[0].annotations,
    ]
  }
}

# IAM policy to make the service public
resource "google_cloud_run_service_iam_member" "noauth" {
  location = var.region
  project  = var.project_id
  service  = google_cloud_run_service.monorepo.name
  role     = "roles/run.invoker"
  member   = "allUsers"

  depends_on = [
    google_cloud_run_service.monorepo
  ]
}
