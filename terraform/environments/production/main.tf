terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    bucket = "grantflow-terraform-state"
    prefix = "production"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Secrets module - must be first
module "secrets" {
  source     = "../../modules/secrets"
  project_id = var.project_id
}

# Network module
module "network" {
  source     = "../../modules/network"
  project_id = var.project_id
  region     = var.region
}

# Database module with production-optimized settings
module "database" {
  source           = "../../modules/database"
  project_id       = var.project_id
  region           = var.region
  zone             = var.zone
  instance_name    = "grantflow-production"
  tier             = var.database_tier
  disk_size        = var.database_disk_size
  disk_type        = "PD_SSD"                    # SSD for production performance
  backup_enabled   = true                       # Essential for production
  high_availability = true                      # Multi-zone for production
  backup_retention = var.database_backup_retention
  backup_location  = var.backup_location        # Frankfurt for GDPR
  network_id       = module.network.network_id
  
  # Production database flags for performance and monitoring
  enable_query_insights = true
  log_slow_queries     = true
  deletion_protection  = true
}

# Storage module with production settings
module "storage" {
  source         = "../../modules/storage"
  bucket_name    = "grantflow-production-uploads"
  environment    = var.environment
  location       = var.region                   # Frankfurt for GDPR
  retention_days = var.storage_retention_days   # Longer retention for production
  
  # Production-specific storage settings
  enable_versioning     = true                  # File versioning for production
  enable_lifecycle      = true                  # Automated lifecycle management
  uniform_bucket_access = true                  # Enhanced security
}

# Cloud Run services module with production-optimized settings
module "cloud_run" {
  source                    = "../../modules/cloud_run"
  project_id               = var.project_id
  region                   = var.region
  environment              = var.environment
  database_connection_name = module.database.instance_connection_name
  min_instances           = var.min_instances    # Always-warm for production
  max_instances           = var.max_instances    # Higher scaling for production
  cpu_limit               = var.cpu_limit       # Higher CPU for production
  memory_limit            = var.memory_limit    # Higher memory for production
  discord_webhook_url     = var.discord_webhook_url
  
  # Production-specific settings
  enable_cpu_throttling   = false               # No throttling for production
  enable_http2           = true                 # HTTP/2 for performance
  request_timeout        = 300                  # 5-minute timeout for long operations
  concurrency_limit      = 100                  # Higher concurrency for production
}

# Pub/Sub module - needs to come after cloud_run to get service account
module "pubsub" {
  source                               = "../../modules/pubsub"
  project_id                          = var.project_id
  region                              = var.region
  pubsub_invoker_service_account_email = module.cloud_run.pubsub_invoker_service_account_email
  
  # Production-specific Pub/Sub settings
  message_retention_duration = "604800s"        # 7 days retention
  ack_deadline_seconds      = 300               # 5-minute ack deadline
  enable_dead_letter        = true              # Dead letter queues for production
}

# Scheduler module with production settings
module "scheduler" {
  source                              = "../../modules/scheduler"
  project_id                          = var.project_id
  region                              = var.region
  environment                         = var.environment
  scraper_url                         = module.cloud_run.scraper_url
  scheduler_invoker_service_account_email = module.cloud_run.scheduler_invoker_service_account_email
  
  # Production scheduler settings
  timezone = "Europe/Berlin"                    # German timezone for GDPR compliance
}

# Enhanced monitoring module for production
module "monitoring" {
  source              = "../../modules/monitoring"
  project_id          = var.project_id
  environment         = var.environment
  discord_webhook_url = var.discord_webhook_url
  
  # Production-specific monitoring
  enable_uptime_checks    = true                # External uptime monitoring
  enable_error_reporting  = true                # Enhanced error tracking
  alert_thresholds = {
    error_rate_threshold    = 0.01              # 1% error rate threshold
    latency_threshold      = 2000               # 2s latency threshold
    memory_threshold       = 0.85               # 85% memory threshold
    cpu_threshold          = 0.80               # 80% CPU threshold
  }
}

# Production BigQuery dataset with GDPR compliance
resource "google_bigquery_dataset" "frontend" {
  dataset_id  = "grantflow_frontend_production"
  description = "Production frontend analytics and user data"
  location    = var.bigquery_location            # Frankfurt for GDPR

  # Enhanced data retention for production
  default_partition_expiration_ms = 15552000000  # 180 days (6 months)
  default_table_expiration_ms     = 31536000000  # 365 days (1 year)

  # GDPR compliance labels
  labels = {
    environment = var.environment
    service     = "frontend"
    managed_by  = "terraform"
    gdpr_region = "eu"
    data_class  = "production"
  }

  # Access controls for production
  access {
    role          = "OWNER"
    special_group = "projectOwners"
  }

  access {
    role          = "WRITER"
    special_group = "projectWriters"
  }

  access {
    role          = "READER"
    special_group = "projectReaders"
  }

  # Grant BigQuery access to LLM service account for analytics
  access {
    role          = "READER"
    user_by_email = google_service_account.llm_api.email
  }

  # Grant BigQuery access to dedicated BigQuery service account
  access {
    role          = "OWNER"
    user_by_email = google_service_account.bigquery_service.email
  }
}

# Production LLM service account
resource "google_service_account" "llm_api" {
  account_id   = "llm-api-service-account-prod"
  display_name = "LLM API Service Account (Production)"
  description  = "Production service account for accessing LLM APIs and related services"
}

# Production BigQuery service account for Segment integration
resource "google_service_account" "bigquery_service" {
  account_id   = "bigquery-service-prod"
  display_name = "BigQuery Service Account (Production)"
  description  = "Production service account for BigQuery operations and Segment integration"
}

# IAM permissions for LLM service account
resource "google_project_iam_member" "llm_ai_platform" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.llm_api.email}"
}

resource "google_project_iam_member" "llm_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.llm_api.email}"
}

# IAM permissions for BigQuery service account
resource "google_project_iam_member" "bigquery_data_editor" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.bigquery_service.email}"
}

resource "google_project_iam_member" "bigquery_job_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.bigquery_service.email}"
}

# Output important information
output "bigquery_dataset_id" {
  description = "BigQuery dataset ID"
  value       = google_bigquery_dataset.frontend.dataset_id
}

output "llm_service_account_email" {
  description = "LLM service account email"
  value       = google_service_account.llm_api.email
}

output "bigquery_service_account_email" {
  description = "BigQuery service account email for Segment integration"
  value       = google_service_account.bigquery_service.email
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region (Frankfurt for GDPR compliance)"
  value       = var.region
}

output "database_connection_name" {
  description = "Database connection name for Cloud Run services"
  value       = module.database.instance_connection_name
}

output "backend_url" {
  description = "Backend service URL"
  value       = module.cloud_run.backend_url
}

output "scraper_url" {
  description = "Scraper service URL"
  value       = module.cloud_run.scraper_url
}

output "storage_bucket_name" {
  description = "Production storage bucket name"
  value       = module.storage.uploads_bucket_name
}