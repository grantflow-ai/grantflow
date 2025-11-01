variable "region" {
  description = "The region for networking resources"
  type        = string
  default     = "us-central1"
}

variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}
