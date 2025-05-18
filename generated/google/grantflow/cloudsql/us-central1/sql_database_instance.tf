resource "google_sql_database_instance" "tfer--grantflow" {
  database_version    = "POSTGRES_17"
  instance_type       = "CLOUD_SQL_INSTANCE"
  maintenance_version = "POSTGRES_17_4.R20250302.00_10"
  name                = "grantflow"
  project             = "grantflow"
  region              = "us-central1"

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

    deletion_protection_enabled  = "true"
    disk_autoresize              = "true"
    disk_autoresize_limit        = "0"
    disk_size                    = "100"
    disk_type                    = "PD_SSD"
    edition                      = "ENTERPRISE"
    enable_dataplex_integration  = "false"
    enable_google_ml_integration = "false"

    insights_config {
      query_insights_enabled  = "false"
      query_plans_per_minute  = "0"
      query_string_length     = "0"
      record_application_tags = "false"
      record_client_address   = "false"
    }

    ip_configuration {
      authorized_networks {
        name  = "Naaman"
        value = "217.94.248.90"
      }

      enable_private_path_for_google_cloud_services = "false"
      ipv4_enabled                                  = "true"
      server_ca_mode                                = "GOOGLE_MANAGED_INTERNAL_CA"
      ssl_mode                                      = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"
    }

    location_preference {
      zone = "us-central1-c"
    }

    maintenance_window {
      day          = "0"
      hour         = "0"
      update_track = "canary"
    }

    pricing_plan             = "PER_USE"
    retain_backups_on_delete = "false"
    tier                     = "db-custom-4-16384"
  }
}
