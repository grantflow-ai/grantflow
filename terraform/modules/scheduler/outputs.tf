output "scraper_job_name" {
  description = "The name of the Cloud Scheduler job for scraper"
  value       = length(google_cloud_scheduler_job.scraper_daily) > 0 ? google_cloud_scheduler_job.scraper_daily[0].name : ""
}

output "scraper_job_schedule" {
  description = "The schedule for the scraper job"
  value       = length(google_cloud_scheduler_job.scraper_daily) > 0 ? google_cloud_scheduler_job.scraper_daily[0].schedule : ""
}

output "scraper_job_timezone" {
  description = "The timezone for the scraper job"
  value       = length(google_cloud_scheduler_job.scraper_daily) > 0 ? google_cloud_scheduler_job.scraper_daily[0].time_zone : ""
}

output "grant_matcher_job_name" {
  description = "The name of the Cloud Scheduler job for grant matcher"
  value       = google_cloud_scheduler_job.grant_matcher.name
}

output "grant_matcher_job_schedule" {
  description = "The schedule for the grant matcher job"
  value       = google_cloud_scheduler_job.grant_matcher.schedule
}

output "entity_cleanup_job_name" {
  description = "The name of the Cloud Scheduler job for entity cleanup"
  value       = google_cloud_scheduler_job.entity_cleanup.name
}

output "entity_cleanup_job_schedule" {
  description = "The schedule for the entity cleanup job"
  value       = google_cloud_scheduler_job.entity_cleanup.schedule
}