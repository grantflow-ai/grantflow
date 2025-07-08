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

variable "storage_bucket_name" {
  description = "The name of the main storage bucket"
  type        = string
  default     = "grantflow-production-uploads"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "production"
}


variable "database_zone" {
  description = "The zone for the Cloud SQL database"
  type        = string
  default     = "us-central1-c"
}

variable "database_authorized_networks" {
  description = "List of authorized networks for database access"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "monthly_budget_amount" {
  description = "Monthly budget amount in USD for cost alerts"
  type        = string
  default     = "500"
}

variable "discord_webhook_url" {
  description = "Discord webhook URL for monitoring alerts"
  type        = string
  sensitive   = true
}

variable "discord_role_alerts" {
  description = "Discord role ID for alert mentions (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

# Database configuration
variable "database_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-custom-2-8192"  # Production-grade: 2 vCPUs, 8GB RAM
}

variable "database_disk_size" {
  description = "Database disk size in GB"
  type        = number
  default     = 100  # Production disk size
}

variable "database_disk_type" {
  description = "Database disk type (PD_HDD or PD_SSD)"
  type        = string
  default     = "PD_SSD"  # SSD for production performance
}

variable "database_edition" {
  description = "Cloud SQL edition (ENTERPRISE or ENTERPRISE_PLUS)"
  type        = string
  default     = "ENTERPRISE"  # Standard edition
}

# Production configuration variables
variable "database_backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true  # Enable backups for production
}

variable "database_high_availability" {
  description = "Enable high availability (regional)"
  type        = bool
  default     = true  # High availability for production
}

variable "cloud_run_min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 1  # Always keep 1 instance running
}

variable "cloud_run_max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 100  # Allow scaling up to 100 instances
}

variable "cloud_run_cpu" {
  description = "Cloud Run CPU allocation"
  type        = string
  default     = "2"  # 2 vCPUs for production
}

variable "cloud_run_memory" {
  description = "Cloud Run memory allocation"
  type        = string
  default     = "2Gi"  # Production memory allocation
}

variable "storage_class" {
  description = "Default storage class for GCS buckets"
  type        = string
  default     = "STANDARD"
}

variable "storage_retention_days" {
  description = "Default retention period for storage in days"
  type        = number
  default     = 30  # Longer retention for production
}

variable "enable_kms_encryption" {
  description = "Enable KMS encryption for storage buckets"
  type        = bool
  default     = true  # Enable for production security
}