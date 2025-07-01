output "discord_notification_channel_id" {
  description = "The ID of the Discord notification channel"
  value       = google_monitoring_notification_channel.discord.id
}

output "discord_notification_channel_name" {
  description = "The name of the Discord notification channel"
  value       = google_monitoring_notification_channel.discord.name
}

output "alert_policy_ids" {
  description = "Map of alert policy names to their IDs"
  value = merge(
    {
      for k, v in google_monitoring_alert_policy.service_down :
      "service_down_${k}" => v.id
    },
    {
      database_disconnected = google_monitoring_alert_policy.database_disconnected.id
      scraper_not_running   = google_monitoring_alert_policy.scraper_not_running.id
      pubsub_dead           = google_monitoring_alert_policy.pubsub_dead.id
    },
    {
      for k, v in google_monitoring_alert_policy.high_error_rate :
      "high_error_rate_${k}" => v.id
    }
  )
}

output "monitoring_summary" {
  description = "Summary of monitoring configuration"
  value = {
    discord_channel = google_monitoring_notification_channel.discord.display_name
    total_alert_policies = (
      length(google_monitoring_alert_policy.service_down) +
      length(google_monitoring_alert_policy.high_error_rate) +
      3 # database, scraper, pubsub
    )
    services_monitored = ["backend", "crawler", "indexer", "rag", "scraper"]
    environment        = var.environment
  }
}