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
  description = "The project ID"
  type        = string
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = "grantflow-ai"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "monorepo"
}

variable "branch" {
  description = "Branch to trigger builds"
  type        = string
  default     = "development"
}

# Cloud Build triggers for each service
locals {
  services = ["backend", "crawler", "indexer", "rag", "scraper"]
}

resource "google_cloudbuild_trigger" "service_triggers" {
  for_each = toset(local.services)
  
  name        = "${each.key}-deploy-${var.branch}"
  description = "Deploy ${each.key} service on push to ${var.branch}"
  
  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^${var.branch}$"
    }
  }
  
  # Only trigger when service files change
  included_files = [
    "services/${each.key}/**",
    "packages/**",
    "cloudbuild.yaml"
  ]
  
  filename = "cloudbuild.yaml"
  
  substitutions = {
    _SERVICE_NAME = each.key
  }
}