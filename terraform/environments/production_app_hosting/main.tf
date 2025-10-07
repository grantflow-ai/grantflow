terraform {
  required_version = ">= 1.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    bucket = "grantflow-terraform-state"
    prefix = "production-app-hosting"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

module "app_hosting" {
  source          = "../../modules/app_hosting"
  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  backend_id      = var.backend_id
  firebase_app_id = var.firebase_app_id
  image_tag       = var.image_tag
  secret_ids      = var.secret_ids
}

output "app_hosting_url" {
  description = "Firebase App Hosting URL"
  value       = module.app_hosting.url
}

output "app_hosting_backend_id" {
  description = "Firebase App Hosting backend ID"
  value       = module.app_hosting.backend_id
}
