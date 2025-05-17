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
  default     = "grantflow-uploads"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}
