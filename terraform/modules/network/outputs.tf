output "network_self_link" {
  description = "The URI of the created network"
  value       = google_compute_network.default.self_link
}

output "network_id" {
  description = "The ID of the created network"
  value       = google_compute_network.default.id
}

output "network_name" {
  description = "The name of the VPC network"
  value       = google_compute_network.default.name
}

output "subnet_self_link" {
  description = "The URI of the created subnetwork"
  value       = google_compute_subnetwork.default.self_link
}

output "subnet_id" {
  description = "The ID of the created subnetwork"
  value       = google_compute_subnetwork.default.id
}
