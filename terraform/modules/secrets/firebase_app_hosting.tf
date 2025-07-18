# Firebase App Hosting Secrets
# These secrets are used by Firebase App Hosting for the frontend application
# Each environment (staging/production) has its own set of secrets with appropriate suffixes

locals {
  # Define the environment suffix for secrets
  env_suffix = upper(var.environment)

  # List of Firebase App Hosting secrets that need to be created
  firebase_secrets = [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
    "NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_MAILGUN_API_KEY",
    "NEXT_PUBLIC_MOCK_API",
    "NEXT_PUBLIC_MOCK_AUTH",
    "RESEND_API_KEY"
  ]
}

# Create secrets for Firebase App Hosting with environment suffixes
resource "google_secret_manager_secret" "firebase_app_hosting" {
  for_each = toset(local.firebase_secrets)

  secret_id = "${each.key}_${local.env_suffix}"
  project   = var.project_id

  labels = {
    environment = var.environment
    service     = "firebase-app-hosting"
    type        = "frontend-config"
  }

  replication {
    auto {}
  }
}

# Grant Firebase App Hosting service account access to the secrets
resource "google_secret_manager_secret_iam_binding" "firebase_app_hosting_access" {
  for_each = google_secret_manager_secret.firebase_app_hosting

  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"

  members = [
    # Default App Engine/Firebase service account
    "serviceAccount:${var.project_id}@appspot.gserviceaccount.com",
    # Compute Engine default service account (used by App Hosting)
    "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  ]
}

# Output the secret IDs for reference
output "firebase_app_hosting_secrets" {
  description = "Map of Firebase App Hosting secret IDs"
  value = {
    for k, v in google_secret_manager_secret.firebase_app_hosting :
    k => v.secret_id
  }
}