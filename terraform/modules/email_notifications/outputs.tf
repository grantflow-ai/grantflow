output "email_notification_function_name" {
  description = "Name of the email notification Cloud Function"
  value       = google_cloudfunctions2_function.email_notification.name
}

output "email_notification_topic_name" {
  description = "Name of the email notification Pub/Sub topic"
  value       = google_pubsub_topic.email_notifications.name
}

output "email_notification_topic_id" {
  description = "Full ID of the email notification Pub/Sub topic"
  value       = google_pubsub_topic.email_notifications.id
}

output "email_notification_service_account_email" {
  description = "Email of the service account used by the email notification function"
  value       = google_service_account.email_notification.email
}