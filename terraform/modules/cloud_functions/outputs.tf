output "dlq_manager_function_uri" {
  description = "The URI of the DLQ Manager Cloud Function"
  value       = google_cloudfunctions2_function.dlq_manager.service_config[0].uri
}

output "dlq_manager_service_account_email" {
  description = "The service account email for DLQ Manager"
  value       = google_service_account.dlq_manager.email
}