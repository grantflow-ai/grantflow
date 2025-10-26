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

variable "image_tag" {
  description = "Docker image tag for deployments"
  type        = string
  default     = "staging-latest"
}

variable "backend_image_digest" {
  description = "Backend service image digest (passed from CI/CD via TF_VAR)"
  type        = string
  default     = ""
}

variable "crawler_image_digest" {
  description = "Crawler service image digest (passed from CI/CD via TF_VAR)"
  type        = string
  default     = ""
}

variable "indexer_image_digest" {
  description = "Indexer service image digest (passed from CI/CD via TF_VAR)"
  type        = string
  default     = ""
}

variable "rag_image_digest" {
  description = "RAG service image digest (passed from CI/CD via TF_VAR)"
  type        = string
  default     = ""
}

variable "scraper_image_digest" {
  description = "Scraper service image digest (passed from CI/CD via TF_VAR)"
  type        = string
  default     = ""
}

variable "crdt_image_digest" {
  description = "CRDT service image digest (passed from CI/CD via TF_VAR)"
  type        = string
  default     = ""
}