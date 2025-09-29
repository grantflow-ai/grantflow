variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment (staging or production)"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Functions"
  type        = string
}

variable "database_url" {
  description = "PostgreSQL database connection URL"
  type        = string
  sensitive   = true
}

variable "vpc_connector_name" {
  description = "VPC connector name for Cloud Functions"
  type        = string
}

variable "scheduler_invoker_service_account_email" {
  description = "Service account email for Cloud Scheduler"
  type        = string
}