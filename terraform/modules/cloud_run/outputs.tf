output "backend_url" {
  description = "The URL of the deployed backend service"
  value       = var.custom_domain != "" ? "https://${var.custom_domain}" : google_cloud_run_v2_service.backend.uri
}

output "backend_service_id" {
  description = "The ID of the backend service"
  value       = google_cloud_run_v2_service.backend.name
}


output "crawler_url" {
  description = "The URL of the deployed crawler service"
  value       = google_cloud_run_v2_service.crawler.uri
}

output "crawler_service_id" {
  description = "The ID of the crawler service"
  value       = google_cloud_run_v2_service.crawler.name
}


output "indexer_url" {
  description = "The URL of the deployed indexer service"
  value       = google_cloud_run_v2_service.indexer.uri
}

output "indexer_service_id" {
  description = "The ID of the indexer service"
  value       = google_cloud_run_v2_service.indexer.name
}
