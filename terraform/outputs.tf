output "network" {
  description = "The network module outputs"
  value       = module.network
}


output "storage_bucket_name" {
  description = "The main storage bucket name"
  value       = module.storage.uploads_bucket_name
}


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

# Scraper service outputs
output "scraper_url" {
  description = "The URL of the scraper service"
  value       = module.cloud_run.scraper_url
}

output "scraper_bucket_name" {
  description = "The scraper storage bucket name"
  value       = module.storage.scraper_bucket_name
}

# Scheduler outputs
output "scraper_job_name" {
  description = "The name of the Cloud Scheduler job for scraper"
  value       = module.scheduler.scraper_job_name
}

output "scraper_job_schedule" {
  description = "The schedule for the scraper job"
  value       = module.scheduler.scraper_job_schedule
}
