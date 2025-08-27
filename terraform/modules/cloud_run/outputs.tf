output "backend_url" {
  description = "The URL of the deployed backend service"
  value       = var.custom_domain != "" ? "https://${var.custom_domain}" : google_cloud_run_v2_service.backend.uri
}

output "backend_service_id" {
  description = "The ID of the backend service"
  value       = google_cloud_run_v2_service.backend.name
}

output "backend_service_account_email" {
  description = "The email of the backend service account"
  value       = google_cloud_run_v2_service.backend.template[0].service_account
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

output "rag_url" {
  description = "The URL of the deployed RAG service"
  value       = google_cloud_run_v2_service.rag.uri
}

output "rag_service_id" {
  description = "The ID of the RAG service"
  value       = google_cloud_run_v2_service.rag.name
}

output "rag_service_account_email" {
  description = "The email of the RAG service account"
  value       = var.rag_service_account_email != "" ? var.rag_service_account_email : "${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}
