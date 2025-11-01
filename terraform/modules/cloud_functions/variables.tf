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

variable "database_connection_name" {
  description = "Cloud SQL instance connection name"
  type        = string
}

variable "database_connection_string_secret_id" {
  description = "Secret Manager secret ID for DATABASE_CONNECTION_STRING"
  type        = string
}

variable "scheduler_invoker_service_account_email" {
  description = "Service account email for Cloud Scheduler"
  type        = string
}
