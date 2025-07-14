variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "environment" {
  description = "Environment (staging, production)"
  type        = string
}

variable "backend_url" {
  description = "Backend Cloud Run service URL"
  type        = string
}