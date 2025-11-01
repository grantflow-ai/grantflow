output "before_create_url" {
  description = "URL of the before-create function"
  value       = google_cloud_run_v2_service.before_create.uri
}

output "before_sign_in_url" {
  description = "URL of the before-sign-in function"
  value       = google_cloud_run_v2_service.before_sign_in.uri
}

output "service_account_email" {
  description = "Email of the Firebase Auth functions service account"
  value       = google_service_account.firebase_auth_functions.email
}
