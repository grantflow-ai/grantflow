
output "dns_instructions" {
  value = var.custom_domain != "" ? "To use ${var.custom_domain} with Cloud Run, create a CNAME record pointing to: ${substr(google_cloud_run_v2_service.backend.uri, 8, -1)}" : null
}
