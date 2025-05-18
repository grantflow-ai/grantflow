output "monorepo_url" {
  value       = google_cloud_run_service.monorepo.status[0].url
  description = "The URL of the deployed monorepo service"
}
