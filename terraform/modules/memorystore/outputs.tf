output "host" {
  description = "The hostname or IP address of the Memorystore instance"
  value       = google_redis_instance.valkey_cache.host
}

output "port" {
  description = "The port the Memorystore instance is listening on"
  value       = google_redis_instance.valkey_cache.port
}

output "connection_string" {
  description = "The Redis/Valkey connection string for the Memorystore instance"
  value       = "redis://${google_redis_instance.valkey_cache.auth_string}@${google_redis_instance.valkey_cache.host}:${google_redis_instance.valkey_cache.port}"
  sensitive   = true
}

output "instance_id" {
  description = "The ID of the Memorystore instance"
  value       = google_redis_instance.valkey_cache.id
}
