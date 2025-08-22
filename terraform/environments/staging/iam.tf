# Grant Finder Feature - IAM Permissions for Firestore

# Service account for grant matcher cloud function
resource "google_service_account" "grant_matcher" {
  account_id   = "grant-matcher-${var.environment}"
  display_name = "Grant Matcher Cloud Function"
  project      = var.project_id
}

# Firestore permissions for scraper service account
resource "google_project_iam_member" "scraper_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:scraper-${var.environment}@${var.project_id}.iam.gserviceaccount.com"
}

# Firestore permissions for backend service account (for public API)
resource "google_project_iam_member" "backend_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:backend-${var.environment}@${var.project_id}.iam.gserviceaccount.com"
}

# Firestore permissions for grant matcher function
resource "google_project_iam_member" "grant_matcher_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.grant_matcher.email}"
}

# Pub/Sub publisher permission for grant matcher (to send email notifications)
resource "google_project_iam_member" "grant_matcher_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.grant_matcher.email}"
}