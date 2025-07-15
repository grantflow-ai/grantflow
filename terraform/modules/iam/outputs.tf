output "github_actions_service_account_email" {
  description = "The email of the GitHub Actions service account"
  value       = google_service_account.github_actions.email
}

output "github_actions_service_account_name" {
  description = "The fully-qualified name of the GitHub Actions service account"
  value       = google_service_account.github_actions.name
}

output "cloud_storage_admin_service_account_email" {
  description = "The email of the Cloud Storage Admin service account"
  value       = google_service_account.cloud_storage_admin.email
}

output "cloud_storage_admin_service_account_name" {
  description = "The fully-qualified name of the Cloud Storage Admin service account"
  value       = google_service_account.cloud_storage_admin.name
}

output "llm_api_service_account_email" {
  description = "The email of the LLM API service account"
  value       = google_service_account.llm_api_service_account.email
}

output "llm_api_service_account_name" {
  description = "The fully-qualified name of the LLM API service account"
  value       = google_service_account.llm_api_service_account.name
}

output "backend_service_account_email" {
  description = "The email of the backend service account"
  value       = google_service_account.backend.email
}

output "backend_service_account_name" {
  description = "The fully-qualified name of the backend service account"
  value       = google_service_account.backend.name
}
