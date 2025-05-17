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
