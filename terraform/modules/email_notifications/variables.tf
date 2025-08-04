variable "project_id" {
  description = "The project ID to deploy to"
  type        = string
}

variable "region" {
  description = "The region for Cloud Run services"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (staging, prod)"
  type        = string
  default     = "staging"
}

variable "rag_service_account_email" {
  description = "Email of the RAG service account that will publish to the topic"
  type        = string
}