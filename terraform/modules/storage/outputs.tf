output "uploads_bucket_name" {
  description = "The name of the uploads bucket"
  value       = google_storage_bucket.uploads.name
}

output "uploads_bucket_url" {
  description = "The URL of the uploads bucket"
  value       = google_storage_bucket.uploads.url
}

output "uploads_bucket_self_link" {
  description = "The URI of the uploads bucket"
  value       = google_storage_bucket.uploads.self_link
}

output "scraper_bucket_name" {
  description = "The name of the scraper bucket"
  value       = google_storage_bucket.scraper.name
}

output "scraper_bucket_url" {
  description = "The URL of the scraper bucket"
  value       = google_storage_bucket.scraper.url
}

output "scraper_bucket_self_link" {
  description = "The URI of the scraper bucket"
  value       = google_storage_bucket.scraper.self_link
}
