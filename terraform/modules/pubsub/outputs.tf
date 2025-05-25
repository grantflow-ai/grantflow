output "file_indexing_topic_id" {
  description = "The ID of the file indexing topic"
  value       = google_pubsub_topic.file_indexing.id
}

output "file_indexing_topic_name" {
  description = "The name of the file indexing topic"
  value       = google_pubsub_topic.file_indexing.name
}

output "file_indexing_subscription_id" {
  description = "The ID of the file indexing subscription"
  value       = google_pubsub_subscription.file_indexing_subscription.id
}

output "file_indexing_subscription_name" {
  description = "The name of the file indexing subscription"
  value       = google_pubsub_subscription.file_indexing_subscription.name
}

output "url_crawling_topic_id" {
  description = "The ID of the URL crawling topic"
  value       = google_pubsub_topic.url_crawling.id
}

output "url_crawling_topic_name" {
  description = "The name of the URL crawling topic"
  value       = google_pubsub_topic.url_crawling.name
}

output "url_crawling_subscription_id" {
  description = "The ID of the URL crawling subscription"
  value       = google_pubsub_subscription.url_crawling_subscription.id
}

output "url_crawling_subscription_name" {
  description = "The name of the URL crawling subscription"
  value       = google_pubsub_subscription.url_crawling_subscription.name
}
