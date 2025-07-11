terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
  }
}

variable "project_id" {
  description = "The project ID to deploy monitoring resources to"
  type        = string
}

variable "discord_webhook_url" {
  description = "Discord webhook URL for alert notifications"
  type        = string
}

variable "environment" {
  description = "Environment (staging, prod)"
  type        = string
  default     = "staging"
}

variable "discord_role_alerts" {
  description = "Discord role ID for alert mentions"
  type        = string
  default     = ""
}

variable "enable_kms_encryption" {
  description = "Enable KMS encryption for storage buckets (recommended for production)"
  type        = bool
  default     = false
}

variable "enable_uptime_checks" {
  description = "Enable external uptime monitoring"
  type        = bool
  default     = false
}

variable "enable_error_reporting" {
  description = "Enable enhanced error tracking"
  type        = bool
  default     = false
}

variable "alert_thresholds" {
  description = "Alert threshold configuration"
  type = object({
    error_rate_threshold = number
    latency_threshold   = number
    memory_threshold    = number
    cpu_threshold       = number
  })
  default = {
    error_rate_threshold = 0.05  # 5%
    latency_threshold   = 5000   # 5s
    memory_threshold    = 0.90   # 90%
    cpu_threshold       = 0.85   # 85%
  }
}

# KMS resources for storage encryption (production only)
resource "google_kms_key_ring" "monitoring_keyring" {
  count    = var.enable_kms_encryption ? 1 : 0
  name     = "monitoring-keyring-${var.environment}"
  location = "us"
}

resource "google_kms_crypto_key" "monitoring_bucket_key" {
  count    = var.enable_kms_encryption ? 1 : 0
  name     = "monitoring-bucket-key-${var.environment}"
  key_ring = google_kms_key_ring.monitoring_keyring[0].id
  purpose  = "ENCRYPT_DECRYPT"

  lifecycle {
    prevent_destroy = true
  }
}

# Discord notification channel
resource "google_monitoring_notification_channel" "discord" {
  display_name = "Discord Alerts - ${title(var.environment)}"
  type         = "webhook_tokenauth"

  labels = {
    url = var.discord_webhook_url
  }

  user_labels = {
    environment = var.environment
    purpose     = "critical_alerts"
  }
}

# Alert Policy: Service Completely Down
resource "google_monitoring_alert_policy" "service_down" {
  for_each = toset(["backend", "crawler", "indexer", "rag", "scraper"])

  display_name = "${title(each.key)} Service Completely Down"
  combiner     = "OR"
  enabled      = true

  documentation {
    content = "Service ${each.key} has had zero successful (2xx) responses for 5+ minutes. This indicates a complete service outage."
  }

  conditions {
    display_name = "Zero successful responses for 5 minutes"

    condition_threshold {
      filter = join(" AND ", [
        "resource.type=\"cloud_run_revision\"",
        "resource.label.service_name=\"${each.key}\"",
        "metric.type=\"run.googleapis.com/request_count\"",
        "metric.label.response_code_class=\"2xx\""
      ])

      duration        = "300s" # 5 minutes
      comparison      = "COMPARISON_LT"
      threshold_value = 1 # Less than 1 successful response (i.e., zero)

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.discord.name]

  alert_strategy {
    auto_close = "1800s" # 30 minutes
  }
}

# Alert Policy: Database Connection Failure
resource "google_monitoring_alert_policy" "database_disconnected" {
  display_name = "Database Connection Failure"
  combiner     = "OR"
  enabled      = true

  documentation {
    content = "No successful database connections detected for 3+ minutes across all services."
  }

  conditions {
    display_name = "No successful DB connections"

    condition_threshold {
      filter = join(" AND ", [
        "resource.type=\"cloudsql_database\"",
        "resource.label.database_id=\"${var.project_id}:grantflow\"",
        "metric.type=\"cloudsql.googleapis.com/database/network/connections\""
      ])

      duration        = "180s" # 3 minutes
      comparison      = "COMPARISON_LT"
      threshold_value = 1

      aggregations {
        alignment_period     = "180s"
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.discord.name]

  alert_strategy {
    auto_close = "1800s"
  }
}

# Alert Policy: Critical Job Failure (Scraper)
resource "google_monitoring_alert_policy" "scraper_not_running" {
  display_name = "Scraper Service Not Running for 24+ Hours"
  combiner     = "OR"
  enabled      = true

  documentation {
    content = "The scraper service hasn't had any successful requests in 24+ hours, indicating the scheduled job may be failing."
  }

  conditions {
    display_name = "No scraper activity for 24 hours"

    condition_threshold {
      filter = join(" AND ", [
        "resource.type=\"cloud_run_revision\"",
        "resource.label.service_name=\"scraper\"",
        "metric.type=\"run.googleapis.com/request_count\"",
        "metric.label.response_code_class=\"2xx\""
      ])

      duration        = "86400s" # 24 hours
      comparison      = "COMPARISON_LT"
      threshold_value = 1

      aggregations {
        alignment_period     = "3600s" # 1 hour
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.discord.name]

  alert_strategy {
    auto_close = "3600s" # 1 hour
  }
}

# Alert Policy: Pub/Sub Subscription Failures
resource "google_monitoring_alert_policy" "pubsub_dead" {
  display_name = "Pub/Sub Subscriptions Failing"
  combiner     = "OR"
  enabled      = true

  documentation {
    content = "All Pub/Sub subscriptions have been failing for 20+ minutes, indicating message processing issues."
  }

  conditions {
    display_name = "High number of undelivered messages"

    condition_threshold {
      filter = join(" AND ", [
        "resource.type=\"pubsub_subscription\"",
        "metric.type=\"pubsub.googleapis.com/subscription/num_undelivered_messages\""
      ])

      duration        = "1200s" # 20 minutes
      comparison      = "COMPARISON_GT"
      threshold_value = 100 # More than 100 undelivered messages

      aggregations {
        alignment_period     = "300s" # 5 minutes
        per_series_aligner   = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.subscription_id"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.discord.name]

  alert_strategy {
    auto_close = "1800s"
  }
}

# Alert Policy: High Error Rate
resource "google_monitoring_alert_policy" "high_error_rate" {
  for_each = toset(["backend", "crawler", "indexer", "rag"])

  display_name = "${title(each.key)} High Error Rate"
  combiner     = "OR"
  enabled      = true

  documentation {
    content = "Service ${each.key} has >50% error rate for 10+ minutes, indicating systematic issues."
  }

  conditions {
    display_name = "Error rate >50% for 10 minutes"

    condition_threshold {
      filter = join(" AND ", [
        "resource.type=\"cloud_run_revision\"",
        "resource.label.service_name=\"${each.key}\"",
        "metric.type=\"run.googleapis.com/request_count\"",
        "metric.label.response_code_class!=\"2xx\""
      ])

      duration        = "600s" # 10 minutes
      comparison      = "COMPARISON_GT"
      threshold_value = 0.5 # 50% error rate

      aggregations {
        alignment_period     = "300s" # 5 minutes
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.discord.name]

  alert_strategy {
    auto_close = "1800s"
  }
}