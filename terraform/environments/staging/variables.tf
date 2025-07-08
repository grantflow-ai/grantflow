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
  default     = "grantflow-staging-uploads"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "staging"
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
  default     = "db-f1-micro"  # Cheapest option for staging
}

variable "database_disk_size" {
  description = "Database disk size in GB"
  type        = number
  default     = 10  # Minimum disk size
}

variable "database_disk_type" {
  description = "Database disk type (PD_HDD or PD_SSD)"
  type        = string
  default     = "PD_HDD"  # Cheaper than SSD
}

variable "database_edition" {
  description = "Cloud SQL edition (ENTERPRISE or ENTERPRISE_PLUS)"
  type        = string
  default     = "ENTERPRISE"  # Standard edition
}

# Additional configuration variables
variable "database_backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = false  # Disable for staging to save costs
}

variable "database_high_availability" {
  description = "Enable high availability (regional)"
  type        = bool
  default     = false  # Single zone for staging
}

variable "cloud_run_min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0  # Scale to zero when not in use
}

variable "cloud_run_max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 1  # Limit to 1 instance for staging
}

variable "cloud_run_cpu" {
  description = "Cloud Run CPU allocation"
  type        = string
  default     = "1"  # 1 vCPU
}

variable "cloud_run_memory" {
  description = "Cloud Run memory allocation"
  type        = string
  default     = "512Mi"  # Minimum memory
}

variable "storage_class" {
  description = "Default storage class for GCS buckets"
  type        = string
  default     = "STANDARD"
}

variable "storage_retention_days" {
  description = "Default retention period for storage in days"
  type        = number
  default     = 7  # Short retention for staging
}

variable "enable_kms_encryption" {
  description = "Enable KMS encryption for storage buckets"
  type        = bool
  default     = false  # Disable for staging to save costs
}