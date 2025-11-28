variable "project_id" {
  description = "The GCP project ID for production"
  type        = string
  default     = "grantflow-production"
}

variable "region" {
  description = "Firebase App Hosting region"
  type        = string
  default     = "europe-west4"
}

variable "environment" {
  description = "Environment identifier used for backend naming"
  type        = string
  default     = "production"
}

variable "backend_id" {
  description = "Existing Firebase App Hosting backend id"
  type        = string
  default     = "frontend-production"
}

variable "firebase_app_id" {
  description = "Firebase Web App ID for production frontend"
  type        = string
  default     = "1:250940056615:web:920275fd38c2a98a325a02"
}

variable "image_tag" {
  description = "Artifact Registry image tag to deploy"
  type        = string
}

variable "secret_ids" {
  description = "Secret Manager secret IDs required by App Hosting"
  type        = list(string)
  default = [
    "NEXT_PUBLIC_SITE_URL_PRODUCTION",
    "NEXT_PUBLIC_BACKEND_API_BASE_URL_PRODUCTION",
    "NEXT_PUBLIC_FIREBASE_API_KEY_PRODUCTION",
    "NEXT_PUBLIC_FIREBASE_APP_ID_PRODUCTION",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_PRODUCTION",
    "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID_PRODUCTION",
    "NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID_PRODUCTION",
    "NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID_PRODUCTION",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID_PRODUCTION",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_PRODUCTION",
    "NEXT_PUBLIC_SEGMENT_WRITE_KEY_PRODUCTION",
    "RESEND_API_KEY_PRODUCTION"
  ]
}
