terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
  }
}

variable "project_id" {
  description = "The project ID to deploy to"
  type        = string
}

variable "region" {
  description = "The region for the Memorystore instance"
  type        = string
  default     = "us-central1"
}

variable "network_id" {
  description = "The ID of the network to connect the Memorystore instance to"
  type        = string
}

# Memorystore for Redis (Valkey compatible) - Minimal Configuration
resource "google_redis_instance" "valkey_cache" {
  name           = "valkey-cache"
  tier           = "BASIC"
  memory_size_gb = 1 # Minimum size

  region                  = var.region
  project                 = var.project_id
  location_id             = "${var.region}-a" # Specify a zone for the lowest cost option
  redis_version           = "REDIS_7_0"
  reserved_ip_range       = "10.0.0.0/29" # Dedicated small IP range
  authorized_network      = var.network_id
  connect_mode            = "PRIVATE_SERVICE_ACCESS"
  display_name            = "GrantFlow Valkey Cache"
  auth_enabled            = true
  transit_encryption_mode = "DISABLED" # For minimal cost

  # Labels for resource management
  labels = {
    environment = "prod"
    service     = "grantflow"
  }
}
