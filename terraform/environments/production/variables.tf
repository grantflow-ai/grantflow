variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "grantflow-production"
}

variable "region" {
  description = "The GCP region to deploy resources to"
  type        = string
  default     = "europe-west3"
}

variable "zone" {
  description = "The GCP zone to deploy resources to"
  type        = string
  default     = "europe-west3-a"
}

variable "environment" {
  description = "Environment (staging, production)"
  type        = string
  default     = "production"
}

variable "discord_webhook_url" {
  description = "Discord webhook URL for monitoring alerts"
  type        = string
  default     = ""
  sensitive   = true
}

variable "database_tier" {
  description = "The machine type for Cloud SQL instance"
  type        = string
  default     = "db-custom-4-16384"
}

variable "database_disk_size" {
  description = "The size of the database disk in GB"
  type        = number
  default     = 500
}

variable "database_backup_retention" {
  description = "Number of backups to retain"
  type        = number
  default     = 30
}

variable "min_instances" {
  description = "Minimum number of instances for Cloud Run services"
  type        = number
  default     = 1
}

variable "max_instances" {
  description = "Maximum number of instances for Cloud Run services"
  type        = number
  default     = 10
}

variable "cpu_limit" {
  description = "CPU limit for Cloud Run containers"
  type        = string
  default     = "2"
}

variable "memory_limit" {
  description = "Memory limit for Cloud Run containers"
  type        = string
  default     = "4Gi"
}

variable "storage_retention_days" {
  description = "Number of days to retain storage objects"
  type        = number
  default     = 365
}

variable "app_hosting_region" {
  description = "Region for Firebase App Hosting backend"
  type        = string
  default     = "europe-west4"
}

variable "app_hosting_backend_id" {
  description = "Existing Firebase App Hosting backend id"
  type        = string
  default     = "frontend-production"
}

variable "bigquery_location" {
  description = "BigQuery dataset location"
  type        = string
  default     = "europe-west3"
}

variable "backup_location" {
  description = "Backup location for databases"
  type        = string
  default     = "europe-west3"
}

variable "image_tag" {
  description = "Docker image tag for deployments"
  type        = string
  default     = "latest"
}

variable "enable_scheduler" {
  description = "Whether to provision Cloud Scheduler resources in production"
  type        = bool
  default     = false
}

variable "dlq_manager_function_uri" {
  description = "DLQ manager Cloud Function URI (required when scheduler is enabled)"
  type        = string
  default     = ""
}
