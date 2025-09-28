variable "project_id" {
  description = "The project ID to deploy to"
  type        = string
}

variable "region" {
  description = "The region for the Cloud Run service"
  type        = string
  default     = "us-central1"
}

variable "database_connection_name" {
  description = "The connection name of the Cloud SQL instance"
  type        = string
}

variable "environment" {
  description = "Environment (staging, prod)"
  type        = string
  default     = "staging"
}

variable "image_tag_suffix" {
  description = "Image tag suffix (latest, staging-latest)"
  type        = string
  default     = "latest"
}

variable "backend_image_digest" {
  description = "Backend service image SHA digest (optional, takes precedence over tag)"
  type        = string
  default     = ""
}

variable "crawler_image_digest" {
  description = "Crawler service image SHA digest (optional, takes precedence over tag)"
  type        = string
  default     = ""
}

variable "indexer_image_digest" {
  description = "Indexer service image SHA digest (optional, takes precedence over tag)"
  type        = string
  default     = ""
}

variable "rag_image_digest" {
  description = "RAG service image SHA digest (optional, takes precedence over tag)"
  type        = string
  default     = ""
}

variable "scraper_image_digest" {
  description = "Scraper service image SHA digest (optional, takes precedence over tag)"
  type        = string
  default     = ""
}

variable "crdt_image_digest" {
  description = "CRDT service image SHA digest (optional, takes precedence over tag)"
  type        = string
  default     = ""
}

variable "discord_webhook_url" {
  description = "Discord webhook URL for notifications"
  type        = string
  default     = ""
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "cpu_limit" {
  description = "CPU allocation for Cloud Run containers"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Memory allocation for Cloud Run containers"
  type        = string
  default     = "1Gi"
}

variable "crawler_memory_limit" {
  description = "Memory allocation for crawler service (defaults to memory_limit if not set)"
  type        = string
  default     = ""
}

variable "crawler_cpu_limit" {
  description = "CPU allocation for crawler service (defaults to cpu_limit if not set)"
  type        = string
  default     = ""
}

variable "rag_memory_limit" {
  description = "Memory allocation for rag service (defaults to memory_limit if not set)"
  type        = string
  default     = ""
}

variable "rag_cpu_limit" {
  description = "CPU allocation for rag service (defaults to cpu_limit if not set)"
  type        = string
  default     = ""
}

variable "rag_concurrency_limit" {
  description = "Maximum concurrent requests per RAG instance (defaults to concurrency_limit if not set)"
  type        = number
  default     = 0
}

variable "rag_min_instances" {
  description = "Minimum number of RAG instances (defaults to min_instances if not set)"
  type        = number
  default     = -1
}

variable "rag_max_instances" {
  description = "Maximum number of RAG instances (defaults to max_instances if not set)"
  type        = number
  default     = -1
}

variable "indexer_memory_limit" {
  description = "Memory allocation for indexer service (defaults to memory_limit if not set)"
  type        = string
  default     = ""
}

variable "indexer_concurrency_limit" {
  description = "Maximum concurrent requests per indexer instance (defaults to concurrency_limit if not set)"
  type        = number
  default     = 0
}

variable "crawler_concurrency_limit" {
  description = "Maximum concurrent requests per crawler instance (defaults to concurrency_limit if not set)"
  type        = number
  default     = 0
}

variable "indexer_min_instances" {
  description = "Minimum number of indexer instances (defaults to min_instances if not set)"
  type        = number
  default     = -1
}

variable "indexer_max_instances" {
  description = "Maximum number of indexer instances (defaults to max_instances if not set)"
  type        = number
  default     = -1
}

variable "crawler_min_instances" {
  description = "Minimum number of crawler instances (defaults to min_instances if not set)"
  type        = number
  default     = -1
}

variable "crawler_max_instances" {
  description = "Maximum number of crawler instances (defaults to max_instances if not set)"
  type        = number
  default     = -1
}

variable "crdt_memory_limit" {
  description = "Memory allocation for CRDT server (defaults to memory_limit if not set)"
  type        = string
  default     = ""
}

variable "scraper_memory_limit" {
  description = "Memory allocation for scraper service (defaults to memory_limit if not set)"
  type        = string
  default     = ""
}

variable "enable_cpu_throttling" {
  description = "Enable CPU throttling"
  type        = bool
  default     = true
}

variable "enable_http2" {
  description = "Enable HTTP/2"
  type        = bool
  default     = false
}

variable "request_timeout" {
  description = "Request timeout in seconds"
  type        = number
  default     = 300
}

variable "concurrency_limit" {
  description = "Maximum number of concurrent requests per instance"
  type        = number
  default     = 80
}

variable "custom_domain" {
  description = "Custom domain for backend service (e.g., api.grantflow.ai)"
  type        = string
  default     = ""
}

variable "crawler_custom_domain" {
  description = "Custom domain for crawler service"
  type        = string
  default     = ""
}

variable "indexer_custom_domain" {
  description = "Custom domain for indexer service"
  type        = string
  default     = ""
}

variable "rag_custom_domain" {
  description = "Custom domain for rag service"
  type        = string
  default     = ""
}

variable "scraper_custom_domain" {
  description = "Custom domain for scraper service"
  type        = string
  default     = ""
}

variable "backend_service_account_email" {
  description = "Service account email for the backend service"
  type        = string
  default     = ""
}

variable "scraper_service_account_email" {
  description = "Service account email for the scraper service"
  type        = string
  default     = ""
}

variable "rag_service_account_email" {
  description = "Service account email for the RAG service"
  type        = string
  default     = ""
}

variable "debug" {
  description = "Enable debug logging (set to '1' to enable)"
  type        = string
  default     = ""
}

variable "liveness_probe_initial_delay" {
  description = "Initial delay for liveness probe in seconds"
  type        = number
  default     = 90
}

variable "liveness_probe_timeout" {
  description = "Timeout for liveness probe in seconds"
  type        = number
  default     = 30
}

variable "liveness_probe_period" {
  description = "Period for liveness probe in seconds"
  type        = number
  default     = 30
}

variable "liveness_probe_failure_threshold" {
  description = "Failure threshold for liveness probe"
  type        = number
  default     = 3
}

variable "startup_probe_initial_delay" {
  description = "Initial delay for startup probe in seconds"
  type        = number
  default     = 10
}

variable "startup_probe_timeout" {
  description = "Timeout for startup probe in seconds"
  type        = number
  default     = 5
}

variable "startup_probe_period" {
  description = "Period for startup probe in seconds"
  type        = number
  default     = 10
}

variable "startup_probe_failure_threshold" {
  description = "Failure threshold for startup probe"
  type        = number
  default     = 18
}