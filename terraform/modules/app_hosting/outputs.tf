output "backend_id" {
  description = "The ID of the App Hosting backend"
  value       = google_firebase_app_hosting_backend.frontend.backend_id
}

output "url" {
  description = "The URL of the App Hosting deployment"
  value       = "https://${google_firebase_app_hosting_backend.frontend.backend_id}--${var.project_id}.${var.region}.hosted.app"
}

output "service_account_email" {
  description = "The email of the service account used by App Hosting"
  value       = google_service_account.app_hosting.email
}

output "build_id" {
  description = "The ID of the current build"
  value       = google_firebase_app_hosting_build.frontend.build_id
}
