output "instance_name" {
  description = "The name of the database instance"
  value       = google_sql_database_instance.main.name
}

output "instance_connection_name" {
  description = "The connection name of the instance to be used in connection strings"
  value       = google_sql_database_instance.main.connection_name
}

output "database_name" {
  description = "The name of the database"
  value       = google_sql_database.postgres.name
}

output "instance_ip_address" {
  description = "The IPv4 address of the master database instance"
  value       = google_sql_database_instance.main.ip_address[0].ip_address
}

output "instance_self_link" {
  description = "The URI of the master instance"
  value       = google_sql_database_instance.main.self_link
}
