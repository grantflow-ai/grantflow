output "database_connection_string_id" {
  description = "The ID of the database connection string secret"
  value       = google_secret_manager_secret.database_connection_string.id
}

output "firebase_service_account_credentials_id" {
  description = "The ID of the Firebase service account credentials secret"
  value       = google_secret_manager_secret.firebase_service_account_credentials.id
}

output "llm_service_account_credentials_id" {
  description = "The ID of the LLM service account credentials secret"
  value       = google_secret_manager_secret.llm_service_account_credentials.id
}

output "jwt_secret_id" {
  description = "The ID of the JWT secret"
  value       = google_secret_manager_secret.jwt_secret.id
}

output "admin_access_code_id" {
  description = "The ID of the admin access code secret"
  value       = google_secret_manager_secret.admin_access_code.id
}

output "anthropic_api_key_id" {
  description = "The ID of the Anthropic API key secret"
  value       = google_secret_manager_secret.anthropic_api_key.id
}

output "gcs_service_account_credentials_id" {
  description = "The ID of the GCS service account credentials secret"
  value       = google_secret_manager_secret.gcs_service_account_credentials.id
}

output "secrets_keyring_id" {
  description = "The ID of the KMS key ring used for secret encryption"
  value       = google_kms_key_ring.secrets_keyring.id
}

output "secrets_key_id" {
  description = "The ID of the KMS key used for secret encryption"
  value       = google_kms_crypto_key.secrets_key.id
}

output "stripe_secret_key_id" {
  description = "The ID of the Stripe secret key"
  value       = google_secret_manager_secret.stripe_secret_key.id
}

output "stripe_webhook_secret_id" {
  description = "The ID of the Stripe webhook secret"
  value       = google_secret_manager_secret.stripe_webhook_secret.id
}

output "stripe_publishable_key_id" {
  description = "The ID of the Stripe publishable key"
  value       = google_secret_manager_secret.stripe_publishable_key.id
}
