output "load_balancer_ip" {
  description = "Load balancer IP address"
  value       = google_compute_global_address.backend_ip.address
}

output "load_balancer_url" {
  description = "Load balancer URL"
  value       = var.enable_ssl ? "https://${var.domain}" : "http://${var.domain}"
}

output "ssl_certificate_status" {
  description = "SSL certificate status"
  value       = var.enable_ssl ? "enabled" : "disabled"
}