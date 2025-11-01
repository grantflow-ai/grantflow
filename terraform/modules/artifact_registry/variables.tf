variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "location" {
  description = "Location for the Artifact Registry repository"
  type        = string
  default     = "us-east1"
}

variable "repository_name" {
  description = "Name of the Artifact Registry repository"
  type        = string
  default     = "grantflow"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "retention_days" {
  description = "Number of days to retain images before deletion"
  type        = number
  default     = 7
}

variable "keep_recent_count" {
  description = "Number of recent images to always keep regardless of age"
  type        = number
  default     = 10
}

variable "keep_tag_prefixes" {
  description = "Tag prefixes to always keep (e.g., release tags)"
  type        = list(string)
  default     = ["v", "release-", "production-latest", "latest"]
}

variable "reader_service_accounts" {
  description = "Service accounts that need read access to the registry"
  type        = list(string)
  default     = []
}

variable "ci_service_account" {
  description = "CI/CD service account that needs write access"
  type        = string
  default     = "githubactions@grantflow.iam.gserviceaccount.com"
}
