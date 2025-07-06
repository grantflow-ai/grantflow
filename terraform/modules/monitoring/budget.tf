# Budget Alert: Monthly Spend Threshold
resource "google_billing_budget" "monthly_budget" {
  count = var.enable_billing_budget ? 1 : 0

  billing_account = "billingAccounts/0171C4-B36519-F474D3"
  display_name    = "Monthly Budget - ${title(var.environment)}"

  budget_filter {
    projects = ["projects/${var.project_id}"]

    # Optional: Filter by specific services
    # services = ["services/24E6-581D-38E5"] # Cloud Run
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = var.monthly_budget_amount
    }
  }

  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.75
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.9
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.2
    spend_basis       = "FORECASTED_SPEND"
  }

  all_updates_rule {
    pubsub_topic = google_pubsub_topic.budget_alerts.id
  }
}

variable "enable_billing_budget" {
  description = "Whether to create billing budget alerts"
  type        = bool
  default     = false
}

# Pub/Sub topic for budget alerts
resource "google_pubsub_topic" "budget_alerts" {
  name = "budget-alerts-${var.environment}"
}

# Cloud Function to forward budget alerts to Discord
resource "google_cloudfunctions2_function" "budget_to_discord" {
  name        = "budget-alerts-to-discord-${var.environment}"
  location    = "us-central1"
  description = "Forward budget alerts to Discord"

  build_config {
    runtime     = "python312"
    entry_point = "budget_alert_to_discord"

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_zip.name
      }
    }
  }

  service_config {
    available_memory   = "256M"
    timeout_seconds    = 60
    max_instance_count = 10

    environment_variables = {
      DISCORD_WEBHOOK_URL = var.discord_webhook_url
      ENVIRONMENT         = var.environment
    }

    service_account_email = google_service_account.budget_function.email
  }

  event_trigger {
    event_type            = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic          = google_pubsub_topic.budget_alerts.id
    service_account_email = google_service_account.budget_function.email
  }
}

# Service account for the Cloud Function
resource "google_service_account" "budget_function" {
  account_id   = "budget-alerts-function-${var.environment}"
  display_name = "Budget Alerts Function"
  description  = "Service account for budget alerts Cloud Function"
}

# Grant the service account permission to receive Pub/Sub messages
resource "google_pubsub_topic_iam_member" "budget_function_subscriber" {
  topic  = google_pubsub_topic.budget_alerts.name
  role   = "roles/pubsub.subscriber"
  member = "serviceAccount:${google_service_account.budget_function.email}"
}

# Allow the service account to invoke the Cloud Function
resource "google_cloudfunctions2_function_iam_member" "budget_alerts_invoker" {
  project        = google_cloudfunctions2_function.budget_to_discord.project
  location       = google_cloudfunctions2_function.budget_to_discord.location
  cloud_function = google_cloudfunctions2_function.budget_to_discord.name
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${google_service_account.budget_function.email}"
}

# Storage bucket for Cloud Function source
resource "google_storage_bucket" "function_source" {
  name     = "${var.project_id}-budget-functions-${var.environment}"
  location = "US"

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }
}

# Upload the function code
resource "google_storage_bucket_object" "function_zip" {
  name   = "budget-alert-function-${data.archive_file.function.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.function.output_path
}

# Create the function code archive
data "archive_file" "function" {
  type        = "zip"
  output_path = "${path.module}/budget-function.zip"

  source {
    content  = file("../cloud_functions/src/budget_function.py")
    filename = "main.py"
  }

  source {
    content  = file("../cloud_functions/requirements.txt")
    filename = "requirements.txt"
  }
}

# Data source to get billing account
data "google_project" "project" {
  project_id = var.project_id
}

# Additional variables needed
variable "monthly_budget_amount" {
  description = "Monthly budget amount in USD"
  type        = string
  default     = "500" # Adjust based on your needs
}