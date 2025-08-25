
resource "google_service_account" "grant_matcher" {
  account_id   = "grant-matcher-${var.environment}"
  display_name = "Grant Matcher Cloud Function"
  project      = var.project_id
}

resource "google_project_iam_member" "scraper_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:scraper-service@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "backend_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:backend-service@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "grant_matcher_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.grant_matcher.email}"
}

resource "google_project_iam_member" "grant_matcher_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.grant_matcher.email}"
}