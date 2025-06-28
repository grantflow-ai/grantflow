terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

variable "region" {
  description = "The region for networking resources"
  type        = string
  default     = "us-central1"
}

variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

resource "google_compute_network" "default" {
  project                                   = var.project_id
  auto_create_subnetworks                   = true
  delete_default_routes_on_create           = false
  description                               = "Default network for the project"
  name                                      = "default"
  network_firewall_policy_enforcement_order = "AFTER_CLASSIC_FIREWALL"
  routing_mode                              = "REGIONAL"

  lifecycle {
    ignore_changes = all
  }
}

resource "google_compute_subnetwork" "default" {
  project       = var.project_id
  name          = "default"
  ip_cidr_range = "10.128.0.0/20"
  network       = google_compute_network.default.id
  region        = var.region

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }

  lifecycle {
    ignore_changes = all
  }
}


resource "google_compute_global_address" "private_ip_address" {
  name          = "private-service-access"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.default.id
  project       = var.project_id
}


resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.default.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}
