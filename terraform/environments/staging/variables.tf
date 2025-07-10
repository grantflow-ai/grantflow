variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "grantflow"
}

variable "region" {
  description = "The GCP region to deploy resources to"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The GCP zone to deploy resources to"
  type        = string
  default     = "us-central1-a"
}

variable "environment" {
  description = "Environment (staging, prod)"
  type        = string
  default     = "staging"
}

variable "discord_webhook_url" {
  description = "Discord webhook URL for monitoring alerts"
  type        = string
  default     = ""
  sensitive   = true
}