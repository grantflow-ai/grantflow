variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "The region for the Cloud SQL database"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The zone for the Cloud SQL database"
  type        = string
  default     = "us-central1-c"
}

variable "instance_name" {
  description = "The name of the Cloud SQL instance"
  type        = string
  default     = "grantflow"
}

variable "database_version" {
  description = "The database version to use"
  type        = string
  default     = "POSTGRES_17"
}

variable "tier" {
  description = "The machine type to use"
  type        = string
  default     = "db-custom-4-16384"
}

variable "disk_size" {
  description = "The size of the disk in GB"
  type        = number
  default     = 100
}

variable "disk_type" {
  description = "The type of disk (PD_HDD or PD_SSD)"
  type        = string
  default     = "PD_SSD"
}

variable "edition" {
  description = "Cloud SQL edition (ENTERPRISE or ENTERPRISE_PLUS)"
  type        = string
  default     = "ENTERPRISE"
}

variable "authorized_networks" {
  description = "List of authorized networks"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "network_id" {
  description = "The ID of the VPC network to be used"
  type        = string
}

variable "backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "high_availability" {
  description = "Enable high availability (regional)"
  type        = bool
  default     = false
}

variable "backup_retention" {
  description = "Number of backups to retain"
  type        = number
  default     = 7
}

variable "backup_location" {
  description = "Backup location (for GDPR compliance)"
  type        = string
  default     = "us"
}

variable "enable_query_insights" {
  description = "Enable query insights for monitoring"
  type        = bool
  default     = true
}

variable "log_slow_queries" {
  description = "Enable slow query logging"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}