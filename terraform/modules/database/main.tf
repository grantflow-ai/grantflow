terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

resource "google_sql_database_instance" "main" {
  name             = var.instance_name
  project          = var.project_id
  region           = var.region
  database_version = var.database_version
  instance_type    = "CLOUD_SQL_INSTANCE"

  settings {
    activation_policy = "ALWAYS"
    availability_type = var.high_availability ? "REGIONAL" : "ZONAL"

    backup_configuration {
      backup_retention_settings {
        retained_backups = var.backup_retention
        retention_unit   = "COUNT"
      }

      binary_log_enabled             = "false"
      enabled                        = var.backup_enabled
      location                       = var.backup_location
      point_in_time_recovery_enabled = var.backup_enabled
      start_time                     = "22:00"
      transaction_log_retention_days = "7"
    }

    connector_enforcement = "NOT_REQUIRED"

    data_cache_config {
      data_cache_enabled = "false"
    }

    deletion_protection_enabled  = var.deletion_protection
    disk_autoresize              = true
    disk_autoresize_limit        = 0
    disk_size                    = var.disk_size
    disk_type                    = var.disk_type
    edition                      = var.edition
    enable_dataplex_integration  = false
    enable_google_ml_integration = false

    insights_config {
      query_insights_enabled  = var.enable_query_insights
      query_plans_per_minute  = var.enable_query_insights ? 20 : 0
      query_string_length     = var.enable_query_insights ? 1024 : 0
      record_application_tags = var.enable_query_insights
      record_client_address   = var.enable_query_insights
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
      value = var.log_slow_queries ? "1000" : "-1"
    }

    database_flags {
      name  = "log_temp_files"
      value = "0"
    }

    ip_configuration {

      dynamic "authorized_networks" {
        for_each = var.authorized_networks
        content {
          name  = authorized_networks.value.name
          value = authorized_networks.value.value
        }
      }


      enable_private_path_for_google_cloud_services = true



      ipv4_enabled = true


      server_ca_mode = "GOOGLE_MANAGED_INTERNAL_CA"


      ssl_mode = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"


      private_network = var.network_id
    }

    location_preference {
      zone = var.zone
    }

    maintenance_window {
      day          = 1
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
