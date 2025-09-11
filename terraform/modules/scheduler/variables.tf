variable "project_id" {
  description = "The project ID to deploy to"
  type        = string
}

variable "region" {
  description = "The region for the Cloud Scheduler job"
  type        = string
  default     = "us-central1"
}

variable "scraper_url" {
  description = "The URL of the scraper Cloud Run service"
  type        = string
}

variable "scheduler_invoker_service_account_email" {
  description = "Email of the service account used by Cloud Scheduler"
  type        = string
}

variable "environment" {
  description = "Environment (staging, prod)"
  type        = string
  default     = "staging"
}

variable "timezone" {
  description = "Timezone for scheduled jobs"
  type        = string
  default     = "Europe/Berlin"
}

variable "backend_url" {
  description = "The URL of the backend Cloud Run service"
  type        = string
}

variable "pubsub_webhook_token" {
  description = "Token for authenticating webhook requests"
  type        = string
  sensitive   = true
}