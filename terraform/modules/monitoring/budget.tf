resource "google_billing_budget" "monthly_budget" {
  count = var.enable_billing_budget ? 1 : 0

  billing_account = "billingAccounts/0171C4-B36519-F474D3"
  display_name    = "Monthly Budget - ${title(var.environment)}"

  budget_filter {
    projects = ["projects/${var.project_id}"]

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



resource "google_pubsub_topic" "budget_alerts" {
  name = "budget-alerts-${var.environment}"

  message_retention_duration = "86400s" # ~keep 1 day

  labels = {
    environment = var.environment
    purpose     = "budget_monitoring"
  }
}


resource "google_cloudfunctions2_function" "budget_to_discord" {
  name        = "fn-alerts-budget-${var.environment}"
  location    = "us-central1"
  description = "Forward budget alerts to Discord"

  build_config {
    runtime     = "python312"
    entry_point = "budget_alert_to_discord_sync"

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
    retry_policy          = "RETRY_POLICY_RETRY"
  }
}

resource "google_service_account" "budget_function" {
  account_id   = "fn-budget-sa-${var.environment}"
  display_name = "Budget Alerts Function"
  description  = "Service account for budget alerts Cloud Function"
}

resource "google_pubsub_subscription" "budget_alerts_subscription" {
  name  = "budget-alerts-subscription-${var.environment}"
  topic = google_pubsub_topic.budget_alerts.name

  push_config {
    push_endpoint = google_cloudfunctions2_function.budget_to_discord.service_config[0].uri

    oidc_token {
      service_account_email = google_service_account.budget_function.email
    }
  }

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.monitoring_dlq.id
    max_delivery_attempts = 5
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  ack_deadline_seconds = 60

  labels = {
    environment = var.environment
    purpose     = "budget_monitoring"
  }
}

resource "google_pubsub_topic_iam_member" "budget_function_subscriber" {
  topic  = google_pubsub_topic.budget_alerts.name
  role   = "roles/pubsub.subscriber"
  member = "serviceAccount:${google_service_account.budget_function.email}"
}

resource "google_cloudfunctions2_function_iam_member" "budget_alerts_invoker" {
  project        = google_cloudfunctions2_function.budget_to_discord.project
  location       = google_cloudfunctions2_function.budget_to_discord.location
  cloud_function = google_cloudfunctions2_function.budget_to_discord.name
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${google_service_account.budget_function.email}"
}

# ~keep Default encryption is acceptable for function source code
resource "google_storage_bucket" "function_source" {
  name     = "${var.project_id}-budget-functions-${var.environment}"
  location = "US"

  uniform_bucket_level_access = true

  dynamic "encryption" {
    for_each = var.enable_kms_encryption ? [1] : []
    content {
      default_kms_key_name = google_kms_crypto_key.monitoring_bucket_key[0].id
    }
  }

  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket_object" "function_zip" {
  name   = "budget-alert-function-${data.archive_file.function.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.function.output_path
}

data "archive_file" "function" {
  type        = "zip"
  output_path = "${path.module}/budget-function.zip"

  source {
    content  = file("${path.root}/../cloud_functions/src/budget_alerts/main.py")
    filename = "main.py"
  }

  source {
    content  = file("${path.module}/../../cloud_functions/requirements.txt")
    filename = "requirements.txt"
  }
}