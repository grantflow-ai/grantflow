variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The region for Firestore"
  type        = string
}

variable "environment" {
  description = "The environment (staging, production)"
  type        = string
}