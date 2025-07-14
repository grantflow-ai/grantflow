variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "environment" {
  description = "Environment (staging, production)"
  type        = string
}

variable "backend_url" {
  description = "Backend Cloud Run service URL"
  type        = string
}

variable "domain" {
  description = "Domain for the load balancer (e.g., staging-api.grantflow.ai)"
  type        = string
}

variable "enable_ssl" {
  description = "Enable SSL certificate"
  type        = bool
  default     = true
}

variable "enable_cdn" {
  description = "Enable Cloud CDN (more expensive)"
  type        = bool
  default     = false
}