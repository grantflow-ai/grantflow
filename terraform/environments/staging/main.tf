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
    prefix = "staging"
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

# Database module with staging-optimized settings
module "database" {
  source           = "../../modules/database"
  project_id       = var.project_id
  region           = var.region
  zone             = var.zone
  instance_name    = "grantflow-staging"
  tier             = "db-f1-micro"       # Cost-optimized for staging
  disk_size        = 10                  # Minimal storage for staging
  disk_type        = "PD_HDD"           # Cheaper storage type
  backup_enabled   = true               # Enable backups (required for point-in-time recovery)
  high_availability = false             # Single zone for staging
  network_id       = module.network.network_id
}

# Storage module
module "storage" {
  source         = "../../modules/storage"
  bucket_name    = "grantflow-staging-uploads"
  environment    = var.environment
  retention_days = 7  # Shorter retention for staging
}

# Cloud Run services module with staging-optimized settings
module "cloud_run" {
  source                    = "../../modules/cloud_run"
  project_id               = var.project_id
  region                   = var.region
  environment              = var.environment
  database_connection_name = module.database.instance_connection_name
  min_instances           = 0           # Scale to zero for cost savings
  max_instances           = 1           # Limited scaling for staging
  cpu_limit               = "1"        # Minimum CPU for Cloud Run
  memory_limit            = "1Gi"       # Increased memory to handle service requirements
  discord_webhook_url     = var.discord_webhook_url
}

# Pub/Sub module - needs to come after cloud_run to get service account
module "pubsub" {
  source                               = "../../modules/pubsub"
  project_id                          = var.project_id
  region                              = var.region
  pubsub_invoker_service_account_email = module.cloud_run.pubsub_invoker_service_account_email
}

# Scheduler module
module "scheduler" {
  source                              = "../../modules/scheduler"
  project_id                          = var.project_id
  region                              = var.region
  environment                         = var.environment
  scraper_url                         = module.cloud_run.scraper_url
  scheduler_invoker_service_account_email = module.cloud_run.scheduler_invoker_service_account_email
}

# Monitoring module
module "monitoring" {
  source              = "../../modules/monitoring"
  project_id          = var.project_id
  environment         = var.environment
  discord_webhook_url = var.discord_webhook_url
}

# Import existing BigQuery dataset
resource "google_bigquery_dataset" "frontend" {
  dataset_id  = "grantflow_frontend"
  description = "Frontend analytics and user data"
  location    = "US"

  # Time-based partitioning for cost optimization
  default_partition_expiration_ms = 5184000000 # 60 days

  # Labels for organization
  labels = {
    environment = var.environment
    service     = "frontend"
    managed_by  = "terraform"
  }

  # Access controls
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

  # Grant BigQuery access to dedicated BigQuery service account (same as deleted one)
  access {
    role          = "OWNER"
    user_by_email = google_service_account.bigquery_service.email
  }
}

# Import existing LLM service account
resource "google_service_account" "llm_api" {
  account_id   = "llm-api-service-account"
  display_name = "LLM API Service Account"
  description  = "Service account for accessing LLM APIs and related services"
}

# BigQuery service account for Segment integration
resource "google_service_account" "bigquery_service" {
  account_id   = "bigquery-service"
  display_name = "BigQuery Service Account"
  description  = "Service account for BigQuery operations and Segment integration"
}

# Ensure LLM service account has AI Platform access
resource "google_project_iam_member" "llm_ai_platform" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.llm_api.email}"
}

# Optional: Grant LLM service account logging permissions
resource "google_project_iam_member" "llm_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.llm_api.email}"
}

# BigQuery service account permissions for Segment integration
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