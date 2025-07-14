# API Gateway for GrantFlow Backend
# Provides a deterministic URL for the backend API

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
}

# Enable required APIs
resource "google_project_service" "api_gateway" {
  service = "apigateway.googleapis.com"
}

resource "google_project_service" "service_control" {
  service = "servicecontrol.googleapis.com"
}

resource "google_project_service" "service_management" {
  service = "servicemanagement.googleapis.com"
}

# API Gateway API
resource "google_api_gateway_api" "backend_api" {
  provider = google-beta
  api_id   = "grantflow-backend-${var.environment}"

  labels = {
    environment = var.environment
    service     = "backend"
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.api_gateway]
}

# API Gateway Config
resource "google_api_gateway_api_config" "backend_config" {
  provider      = google-beta
  api           = google_api_gateway_api.backend_api.api_id
  api_config_id = "config-${var.environment}"

  openapi_documents {
    document {
      path     = "openapi.yaml"
      contents = base64encode(local.openapi_spec)
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Gateway
resource "google_api_gateway_gateway" "backend_gateway" {
  provider   = google-beta
  api_config = google_api_gateway_api_config.backend_config.id
  gateway_id = "grantflow-backend-gateway-${var.environment}"
  region     = var.region

  labels = {
    environment = var.environment
    service     = "backend"
    managed_by  = "terraform"
  }
}

# OpenAPI specification for the backend
locals {
  openapi_spec = templatefile("${path.module}/openapi.yaml.tpl", {
    backend_url = var.backend_url
    project_id  = var.project_id
  })
}