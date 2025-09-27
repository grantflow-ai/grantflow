variable "bucket_name" {
  description = "The name of the storage bucket"
  type        = string
  default     = "grantflow-uploads"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "file_indexing_topic" {
  description = "The Pub/Sub topic for file indexing notifications"
  type        = string
  default     = "file-indexing"
}

variable "storage_class" {
  description = "Default storage class for the bucket"
  type        = string
  default     = "STANDARD"
}

variable "retention_days" {
  description = "Object lifecycle retention in days"
  type        = number
  default     = 30
}

variable "location" {
  description = "Storage bucket location (for GDPR compliance)"
  type        = string
  default     = "US"
}

variable "enable_versioning" {
  description = "Enable object versioning"
  type        = bool
  default     = false
}

variable "enable_lifecycle" {
  description = "Enable lifecycle management"
  type        = bool
  default     = true
}

variable "uniform_bucket_access" {
  description = "Enable uniform bucket-level access"
  type        = bool
  default     = true
}

variable "backend_service_account_email" {
  description = "Email of the backend service account for GCS access"
  type        = string
}