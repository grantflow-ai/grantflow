variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "grantflow-production"
}

variable "region" {
  description = "The GCP region to deploy resources to"
  type        = string
  default     = "europe-west3"  # Frankfurt for GDPR compliance
}

variable "zone" {
  description = "The GCP zone to deploy resources to"
  type        = string
  default     = "europe-west3-a"  # Frankfurt zone
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

# Production-specific database variables
variable "database_tier" {
  description = "The machine type for Cloud SQL instance"
  type        = string
  default     = "db-custom-4-16384"  # Production-grade: 4 vCPU, 16GB RAM
}

variable "database_disk_size" {
  description = "The size of the database disk in GB"
  type        = number
  default     = 500  # Larger disk for production
}

variable "database_backup_retention" {
  description = "Number of backups to retain"
  type        = number
  default     = 30  # Longer retention for production
}

# Production-specific Cloud Run variables
variable "min_instances" {
  description = "Minimum number of instances for Cloud Run services"
  type        = number
  default     = 1  # Always-warm instances for production
}

variable "max_instances" {
  description = "Maximum number of instances for Cloud Run services"
  type        = number
  default     = 10  # Higher scaling for production
}

variable "cpu_limit" {
  description = "CPU limit for Cloud Run containers"
  type        = string
  default     = "2"  # Higher CPU for production
}

variable "memory_limit" {
  description = "Memory limit for Cloud Run containers"
  type        = string
  default     = "4Gi"  # Higher memory for production
}

# Production-specific storage variables
variable "storage_retention_days" {
  description = "Number of days to retain storage objects"
  type        = number
  default     = 365  # Longer retention for production
}

# BigQuery location variable for GDPR compliance
variable "bigquery_location" {
  description = "BigQuery dataset location"
  type        = string
  default     = "europe-west3"  # Frankfurt for GDPR compliance
}

# Backup location for GDPR compliance
variable "backup_location" {
  description = "Backup location for databases"
  type        = string
  default     = "europe-west3"  # Frankfurt for GDPR compliance
}