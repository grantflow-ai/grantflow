# Network Outputs
output "network" {
  description = "The network module outputs"
  value       = module.network
}

# Storage Outputs
output "storage_bucket_name" {
  description = "The main storage bucket name"
  value       = module.storage.uploads_bucket_name
}

# Cloud Run Outputs
output "backend_url" {
  description = "The URL of the backend service"
  value       = module.cloud_run.backend_url
}

output "crawler_url" {
  description = "The URL of the crawler service"
  value       = module.cloud_run.crawler_url
}

output "indexer_url" {
  description = "The URL of the indexer service"
  value       = module.cloud_run.indexer_url
}

# Database Outputs
output "database_instance_name" {
  description = "The name of the database instance"
  value       = module.database.instance_name
}

output "database_connection_name" {
  description = "The connection name of the database instance"
  value       = module.database.instance_connection_name
}

output "database_ip_address" {
  description = "The IP address of the database instance"
  value       = module.database.instance_ip_address
}

# Memorystore Outputs
output "valkey_host" {
  description = "The hostname of the Valkey instance"
  value       = module.memorystore.host
}

output "valkey_port" {
  description = "The port of the Valkey instance"
  value       = module.memorystore.port
}

output "valkey_instance_id" {
  description = "The ID of the Valkey instance"
  value       = module.memorystore.instance_id
}
