terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "The region for the Cloud SQL database"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The zone for the Cloud SQL database"
  type        = string
  default     = "us-central1-c"
}

variable "instance_name" {
  description = "The name of the Cloud SQL instance"
  type        = string
  default     = "grantflow"
}

variable "database_version" {
  description = "The database version to use"
  type        = string
  default     = "POSTGRES_17"
}

variable "tier" {
  description = "The machine type to use"
  type        = string
  default     = "db-custom-4-16384"
}

variable "disk_size" {
  description = "The size of the disk in GB"
  type        = number
  default     = 100
}

variable "authorized_networks" {
  description = "List of authorized networks"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "network_id" {
  description = "The ID of the VPC network to be used"
  type        = string
}

resource "google_sql_database_instance" "main" {
  name             = var.instance_name
  project          = var.project_id
  region           = var.region
  database_version = var.database_version
  instance_type    = "CLOUD_SQL_INSTANCE"

  settings {
    activation_policy = "ALWAYS"
    availability_type = "ZONAL"

    backup_configuration {
      backup_retention_settings {
        retained_backups = "7"
        retention_unit   = "COUNT"
      }

      binary_log_enabled             = "false"
      enabled                        = "true"
      location                       = "us"
      point_in_time_recovery_enabled = "true"
      start_time                     = "22:00"
      transaction_log_retention_days = "7"
    }

    connector_enforcement = "NOT_REQUIRED"

    data_cache_config {
      data_cache_enabled = "false"
    }

    deletion_protection_enabled  = true
    disk_autoresize              = true
    disk_autoresize_limit        = 0
    disk_size                    = var.disk_size
    disk_type                    = "PD_SSD"
    edition                      = "ENTERPRISE"
    enable_dataplex_integration  = false
    enable_google_ml_integration = false

    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 20
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    database_flags {
      name  = "log_disconnections"
      value = "on"
    }

    database_flags {
      name  = "log_lock_waits"
      value = "on"
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }

    database_flags {
      name  = "log_temp_files"
      value = "0"
    }

    ip_configuration {
      # For security, we're limiting authorized networks to only those explicitly defined
      dynamic "authorized_networks" {
        for_each = var.authorized_networks
        content {
          name  = authorized_networks.value.name
          value = authorized_networks.value.value
        }
      }

      # Enable private path for Google Cloud services
      enable_private_path_for_google_cloud_services = true

      # For production, we recommend setting ipv4_enabled to false and using private IP instead
      # For now, keeping public IP for development purposes but with restricted access
      ipv4_enabled = true

      # Using Google-managed CA for certificates
      server_ca_mode = "GOOGLE_MANAGED_INTERNAL_CA"

      # Make SSL optional for development purposes
      ssl_mode = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"

      # Add private network configuration
      private_network = var.network_id
    }

    location_preference {
      zone = var.zone
    }

    maintenance_window {
      day          = 0
      hour         = 0
      update_track = "canary"
    }

    pricing_plan             = "PER_USE"
    retain_backups_on_delete = false
    tier                     = var.tier
  }
}

resource "google_sql_database" "postgres" {
  name            = "postgres"
  instance        = google_sql_database_instance.main.name
  charset         = "UTF8"
  collation       = "en_US.UTF8"
  deletion_policy = "DELETE"
  project         = var.project_id
}
