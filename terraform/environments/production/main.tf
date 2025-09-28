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

module "secrets" {
  source      = "../../modules/secrets"
  project_id  = var.project_id
  environment = var.environment
}

module "iam" {
  source = "../../modules/iam"
}

module "artifact_registry" {
  source             = "../../modules/artifact_registry"
  project_id         = var.project_id
  location           = "us-east1"
  environment        = var.environment
  repository_name    = "grantflow"
  retention_days     = 30
  keep_recent_count  = 50
  keep_tag_prefixes  = ["v", "release-", "production-", "latest"]
  ci_service_account = module.iam.github_actions_service_account_email
  reader_service_accounts = [
    module.iam.backend_service_account_email,
    module.iam.scraper_service_account_email,
    module.iam.rag_service_account_email
  ]
}

module "network" {
  source     = "../../modules/network"
  project_id = var.project_id
  region     = var.region
}

module "database" {
  source            = "../../modules/database"
  project_id        = var.project_id
  region            = var.region
  zone              = var.zone
  instance_name     = "grantflow-production"
  tier              = var.database_tier
  disk_size         = var.database_disk_size
  disk_type         = "PD_SSD"
  backup_enabled    = true
  high_availability = true
  backup_retention  = var.database_backup_retention
  backup_location   = var.backup_location
  network_id        = module.network.network_id

  enable_query_insights = true
  log_slow_queries      = true
  deletion_protection   = true
}

module "storage" {
  source         = "../../modules/storage"
  bucket_name    = "grantflow-production-uploads"
  environment    = var.environment
  location       = var.region
  retention_days = var.storage_retention_days

  enable_versioning     = true
  enable_lifecycle      = true
  uniform_bucket_access = true
}

module "cloud_run" {
  source                        = "../../modules/cloud_run"
  project_id                    = var.project_id
  region                        = var.region
  environment                   = var.environment
  database_connection_name      = module.database.instance_connection_name
  backend_service_account_email = module.iam.backend_service_account_email
  scraper_service_account_email = module.iam.scraper_service_account_email
  rag_service_account_email     = module.iam.rag_service_account_email
  min_instances                 = var.min_instances
  max_instances                 = var.max_instances
  cpu_limit                     = var.cpu_limit
  memory_limit                  = var.memory_limit
  crawler_memory_limit          = "4Gi" # ~keep Same as default but explicit for crawler due to browser automation needs
  indexer_memory_limit          = "4Gi" # ~keep Increased memory for indexer to prevent OOM issues
  scraper_memory_limit          = "4Gi" # ~keep Increased memory to match crawler/indexer for document processing
  indexer_concurrency_limit     = 50    # ~keep Optimized concurrency for indexer (10 instances × 50 = 500 concurrent)
  discord_webhook_url           = var.discord_webhook_url

  enable_cpu_throttling = false
  enable_http2          = true
  request_timeout       = 300
  concurrency_limit     = 100
}

module "pubsub" {
  source                               = "../../modules/pubsub"
  project_id                           = var.project_id
  region                               = var.region
  pubsub_invoker_service_account_email = module.cloud_run.pubsub_invoker_service_account_email
  rag_service_account_email            = module.iam.rag_service_account_email

  message_retention_duration = "604800s"
  ack_deadline_seconds       = 600 # ~keep 10 minutes (maximum allowed by Google Cloud)
  enable_dead_letter         = true

  # ~keep Specific timeouts for different subscription types (max 600s per Google Cloud)
  file_indexing_ack_deadline  = 600 # ~keep 10 minutes for file processing (max allowed)
  url_crawling_ack_deadline   = 600 # ~keep 10 minutes for URL crawling
  rag_processing_ack_deadline = 600 # ~keep 10 minutes for RAG processing (max allowed)
  dlq_ack_deadline            = 600 # ~keep 10 minutes for DLQ processing (max allowed)

  # ~keep Production retry configuration for better burst handling
  indexer_retry_minimum_backoff = "60s"
  indexer_retry_maximum_backoff = "900s"

  indexer_url = module.cloud_run.indexer_url
  crawler_url = module.cloud_run.crawler_url
  rag_url     = module.cloud_run.rag_url
  backend_url = module.cloud_run.backend_url

  backend_service_account_email    = module.iam.backend_service_account_email
  email_notifications_ack_deadline = 60 # ~keep 1 minute for email notifications
}

module "scheduler" {
  source                                  = "../../modules/scheduler"
  project_id                              = var.project_id
  region                                  = var.region
  environment                             = var.environment
  scraper_url                             = module.cloud_run.scraper_url
  backend_url                             = module.cloud_run.backend_url
  scheduler_invoker_service_account_email = module.cloud_run.scheduler_invoker_service_account_email
  timezone                                = "Europe/Berlin"
}


resource "google_bigquery_dataset" "frontend" {
  dataset_id  = "grantflow_frontend_production"
  description = "Production frontend analytics and user data"
  location    = var.bigquery_location

  default_partition_expiration_ms = 15552000000
  default_table_expiration_ms     = 31536000000

  labels = {
    environment = var.environment
    service     = "frontend"
    managed_by  = "terraform"
    gdpr_region = "eu"
    data_class  = "production"
  }

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

  access {
    role          = "READER"
    user_by_email = google_service_account.llm_api.email
  }

  access {
    role          = "OWNER"
    user_by_email = google_service_account.bigquery_service.email
  }
}

resource "google_service_account" "llm_api" {
  account_id   = "llm-api-service-account-prod"
  display_name = "LLM API Service Account (Production)"
  description  = "Production service account for accessing LLM APIs and related services"
}

resource "google_service_account" "bigquery_service" {
  account_id   = "bigquery-service-prod"
  display_name = "BigQuery Service Account (Production)"
  description  = "Production service account for BigQuery operations and Segment integration"
}

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