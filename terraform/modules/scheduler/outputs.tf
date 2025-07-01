output "scraper_job_name" {
  description = "The name of the Cloud Scheduler job for scraper"
  value       = google_cloud_scheduler_job.scraper_daily.name
}

output "scraper_job_schedule" {
  description = "The schedule for the scraper job"
  value       = google_cloud_scheduler_job.scraper_daily.schedule
}

output "scraper_job_timezone" {
  description = "The timezone for the scraper job"
  value       = google_cloud_scheduler_job.scraper_daily.time_zone
}