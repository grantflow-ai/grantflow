output "api_gateway_url" {
  description = "API Gateway URL for the backend"
  value       = google_api_gateway_gateway.backend_gateway.default_hostname
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = google_api_gateway_gateway.backend_gateway.gateway_id
}

output "api_config_id" {
  description = "API Config ID"
  value       = google_api_gateway_api_config.backend_config.api_config_id
}