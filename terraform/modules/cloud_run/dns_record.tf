# Instead of a Load Balancer, we can use a CNAME record
# This is much cheaper but has limitations:
# 1. URL will still show the Cloud Run domain after redirect
# 2. Can't use root domain (must be subdomain)
# 3. SSL cert will be for *.run.app, not your domain

output "dns_instructions" {
  value = var.custom_domain != "" ? "To use ${var.custom_domain} with Cloud Run, create a CNAME record pointing to: ${substr(google_cloud_run_v2_service.backend.uri, 8, -1)}" : null
}