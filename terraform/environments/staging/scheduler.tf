
resource "google_cloud_scheduler_job" "grant_matcher_daily" {
  name      = "grant-matcher-daily-${var.environment}"
  project   = var.project_id
  region    = var.region
  schedule  = "0 3 * * *"
  time_zone = "UTC"

  description = "Daily job to match new grants against user subscriptions"

  http_target {
    uri = "https://${var.region}-${var.project_id}.cloudfunctions.net/fn-grant-matcher-${var.environment}"

    http_method = "POST"

    oidc_token {
      service_account_email = google_service_account.grant_matcher.email
      audience              = "https://${var.region}-${var.project_id}.cloudfunctions.net/fn-grant-matcher-${var.environment}"
    }
  }

  retry_config {
    retry_count          = 3
    max_retry_duration   = "600s"
    min_backoff_duration = "60s"
    max_backoff_duration = "300s"
    max_doublings        = 2
  }
}