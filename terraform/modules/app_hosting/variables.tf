variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for App Hosting"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (staging or production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production"
  }
}

variable "firebase_app_id" {
  description = "Firebase Web App ID"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "secret_ids" {
  description = "List of Secret Manager secret IDs that App Hosting needs access to"
  type        = list(string)
  default     = []
}

variable "custom_domain" {
  description = "Custom domain to configure (optional)"
  type        = string
  default     = null
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
}

variable "cpu" {
  description = "CPU allocation per instance"
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory allocation per instance"
  type        = string
  default     = "1Gi"
}

variable "concurrency" {
  description = "Maximum concurrent requests per instance"
  type        = number
  default     = 80
}

variable "environment_variables" {
  description = "Environment variables to set on the container"
  type        = map(string)
  default     = {}
}