
output "firebase_admin_sdk_email" {
  description = "Email of the Firebase Admin SDK service account"
  value       = google_service_account.firebase_admin_sdk.email
}

output "firebase_app_hosting_compute_email" {
  description = "Email of the Firebase App Hosting compute service account"
  value       = google_service_account.firebase_app_hosting_compute.email
}

output "grantflow_staging_apphosting_email" {
  description = "Email of the Firebase App Hosting staging service account"
  value       = google_service_account.grantflow_staging_apphosting.email
}