variable "project_id" {
  description = "The project ID to deploy to"
  type        = string
  default     = "grantflow"
}

variable "region" {
  description = "The region for the Cloud Run service"
  type        = string
  default     = "us-central1"
}

variable "pubsub_invoker_service_account_email" {
  description = "Email of the service account used for Pub/Sub to invoke Cloud Run"
  type        = string
}

variable "message_retention_duration" {
  description = "Message retention duration"
  type        = string
  default     = "86400s"
}

variable "ack_deadline_seconds" {
  description = "Acknowledgment deadline in seconds (deprecated, use specific variables)"
  type        = number
  default     = 60
}

variable "file_indexing_ack_deadline" {
  description = "Acknowledgment deadline for file-indexing subscription in seconds"
  type        = number
  default     = 600
}

variable "url_crawling_ack_deadline" {
  description = "Acknowledgment deadline for url-crawling subscription in seconds"
  type        = number
  default     = 600
}

variable "rag_processing_ack_deadline" {
  description = "Acknowledgment deadline for rag-processing subscription in seconds"
  type        = number
  default     = 600
}

variable "dlq_ack_deadline" {
  description = "Acknowledgment deadline for dead letter queue subscriptions in seconds"
  type        = number
  default     = 600
}

variable "enable_dead_letter" {
  description = "Enable dead letter queues"
  type        = bool
  default     = false
}

variable "indexer_retry_minimum_backoff" {
  description = "Minimum backoff duration for indexer retries (to prevent burst storms)"
  type        = string
  default     = "30s"
}

variable "indexer_retry_maximum_backoff" {
  description = "Maximum backoff duration for indexer retries"
  type        = string
  default     = "600s"
}

variable "indexer_url" {
  description = "URL of the indexer Cloud Run service"
  type        = string
}

variable "crawler_url" {
  description = "URL of the crawler Cloud Run service"
  type        = string
}

variable "rag_url" {
  description = "URL of the RAG Cloud Run service"
  type        = string
}

variable "rag_service_account_email" {
  description = "Email of the RAG service account"
  type        = string
  default     = ""
}

variable "backend_url" {
  description = "URL of the backend Cloud Run service"
  type        = string
}

variable "backend_service_account_email" {
  description = "Email of the backend service account"
  type        = string
  default     = ""
}

variable "email_notifications_ack_deadline" {
  description = "Acknowledgment deadline for email-notifications subscription in seconds"
  type        = number
  default     = 60
}