
terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

locals {
  backend_service_name = split("-", split("//", var.backend_url)[1])[0]
  backend_region       = var.region
}

resource "google_compute_region_network_endpoint_group" "backend_neg" {
  name                  = "backend-neg-${var.environment}"
  network_endpoint_type = "SERVERLESS"
  region                = local.backend_region
  project               = var.project_id

  cloud_run {
    service = local.backend_service_name
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_region_network_endpoint_group" "crdt_neg_us_central1" {
  name                  = "crdt-neg-us-central1"
  network_endpoint_type = "SERVERLESS"
  region                = local.backend_region
  project               = var.project_id

  cloud_run {
    service = "crdt"
  }

  lifecycle {
    create_before_destroy = true
  }
}


resource "google_compute_backend_service" "backend" {
  name        = "backend-service-${var.environment}"
  protocol    = "HTTPS"
  port_name   = "http"
  timeout_sec = 30
  project     = var.project_id

  enable_cdn = var.enable_cdn

  backend {
    group = google_compute_region_network_endpoint_group.backend_neg.id
  }


  security_policy = var.environment == "production" ? google_compute_security_policy.backend_security[0].id : null

  log_config {
    enable      = true
    sample_rate = var.environment == "staging" ? 0.1 : 1.0
  }
}


resource "google_compute_backend_service" "crdt_backend" {
  name        = "crdt"
  protocol    = "HTTPS"
  port_name   = "http"
  timeout_sec = 30
  project     = var.project_id

  enable_cdn = var.enable_cdn

  backend {
    group = google_compute_region_network_endpoint_group.crdt_neg_us_central1.id
  }


  security_policy = var.environment == "production" ? google_compute_security_policy.backend_security[0].id : null

  log_config {
    enable      = true
    sample_rate = var.environment == "staging" ? 0.1 : 1.0
  }
}


resource "google_compute_url_map" "backend_url_map" {
  name            = "backend-url-map-${var.environment}"
  default_service = google_compute_backend_service.backend.id
  project         = var.project_id

  host_rule {
    hosts        = [var.domain]
    path_matcher = "backend-paths"
  }

  host_rule {
    hosts        = [var.crdt_domain]
    path_matcher = "crdt-paths"
  }

  path_matcher {
    name            = "backend-paths"
    default_service = google_compute_backend_service.backend.id

    path_rule {
      paths   = ["/*"]
      service = google_compute_backend_service.backend.id
    }
  }
  path_matcher {
    name            = "crdt-paths"
    default_service = google_compute_backend_service.crdt_backend.id

    path_rule {
      paths   = ["/*"]
      service = google_compute_backend_service.crdt_backend.id
    }
  }
}

resource "google_compute_managed_ssl_certificate" "backend_ssl" {
  count = var.enable_ssl ? 1 : 0

  name    = "backend-ssl-${var.environment}"
  project = var.project_id

  managed {
    domains = [var.domain]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_managed_ssl_certificate" "crdt_ssl" {
  count = var.enable_ssl ? 1 : 0

  name    = "crdt-ssl-${var.environment}"
  project = var.project_id

  managed {
    domains = [var.crdt_domain]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_target_https_proxy" "backend_https_proxy" {
  count = var.enable_ssl ? 1 : 0

  name    = "backend-https-proxy-${var.environment}"
  url_map = google_compute_url_map.backend_url_map.id
  project = var.project_id
  ssl_certificates = [
    google_compute_managed_ssl_certificate.backend_ssl[0].id,
    google_compute_managed_ssl_certificate.crdt_ssl[0].id
  ]
}

resource "google_compute_target_http_proxy" "backend_http_proxy" {
  name    = "backend-http-proxy-${var.environment}"
  url_map = google_compute_url_map.backend_url_map.id
  project = var.project_id
}

resource "google_compute_global_address" "backend_ip" {
  name    = "backend-ip-${var.environment}"
  project = var.project_id
}

resource "google_compute_global_forwarding_rule" "backend_https" {
  count = var.enable_ssl ? 1 : 0

  name       = "backend-https-${var.environment}"
  target     = google_compute_target_https_proxy.backend_https_proxy[0].id
  port_range = "443"
  ip_address = google_compute_global_address.backend_ip.address
  project    = var.project_id
}

resource "google_compute_global_forwarding_rule" "backend_http" {
  name       = "backend-http-${var.environment}"
  target     = google_compute_target_http_proxy.backend_http_proxy.id
  port_range = "80"
  ip_address = google_compute_global_address.backend_ip.address
  project    = var.project_id
}

resource "google_compute_security_policy" "backend_security" {
  count = var.environment == "production" ? 1 : 0

  name    = "backend-security-${var.environment}"
  project = var.project_id

  rule {
    action   = "allow"
    priority = "1000"

    match {
      versioned_expr = "SRC_IPS_V1"

      config {
        src_ip_ranges = ["*"]
      }
    }

    description = "Default allow rule"
  }

  rule {
    action   = "throttle"
    priority = "100"

    match {
      versioned_expr = "SRC_IPS_V1"

      config {
        src_ip_ranges = ["*"]
      }
    }

    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"

      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
    }

    description = "Rate limit rule"
  }
}
