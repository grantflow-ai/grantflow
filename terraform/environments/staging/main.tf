terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.14"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.14"
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

module "secrets" {
  source      = "../../modules/secrets"
  project_id  = var.project_id
  environment = var.environment
}

module "iam" {
  source = "../../modules/iam"
}

module "network" {
  source     = "../../modules/network"
  project_id = var.project_id
  region     = var.region
}

module "database" {
  source                = "../../modules/database"
  project_id            = var.project_id
  region                = var.region
  zone                  = var.zone
  instance_name         = "grantflow-staging"
  tier                  = "db-custom-1-3840"
  disk_size             = 10
  disk_type             = "PD_HDD"
  backup_enabled        = true
  high_availability     = false
  backup_retention      = 7
  backup_location       = "us"
  enable_query_insights = true
  log_slow_queries      = false
  deletion_protection   = false
  network_id            = module.network.network_id
}

module "storage" {
  source                = "../../modules/storage"
  bucket_name           = "grantflow-staging-uploads"
  environment           = var.environment
  location              = "US"
  retention_days        = 7
  enable_versioning     = false
  enable_lifecycle      = true
  uniform_bucket_access = true
}

module "cloud_run" {
  source                        = "../../modules/cloud_run"
  project_id                    = var.project_id
  region                        = var.region
  environment                   = var.environment
  image_tag_suffix              = "staging-latest"
  database_connection_name      = module.database.instance_connection_name
  backend_service_account_email = module.iam.backend_service_account_email
  scraper_service_account_email = module.iam.scraper_service_account_email
  rag_service_account_email     = module.iam.rag_service_account_email
  min_instances                 = 1
  max_instances                 = 5
  cpu_limit                     = "1"
  memory_limit                  = "1Gi"

  indexer_memory_limit      = "2Gi" # ~keep Indexer needs memory for document processing
  indexer_concurrency_limit = 1     # ~keep ONE message per instance for fanout pattern
  indexer_min_instances     = 0     # ~keep Scale to zero when idle
  indexer_max_instances     = 100   # ~keep High ceiling for burst handling

  crawler_memory_limit      = "2Gi" # ~keep Reduced memory since processing one URL at a time
  crawler_cpu_limit         = "1"   # ~keep Single CPU for single URL processing
  crawler_concurrency_limit = 1     # ~keep ONE URL per instance for fanout pattern
  crawler_min_instances     = 0     # ~keep Scale to zero when idle
  crawler_max_instances     = 50    # ~keep Lower than indexer (URLs process faster)

  rag_memory_limit = "2Gi" # ~keep Reduced memory since processing one URL at a time
  rag_cpu_limit    = "1"   # ~keep Single CPU for single URL processing

  crdt_server_memory_limit = "2Gi"

  discord_webhook_url   = var.discord_webhook_url
  enable_cpu_throttling = true
  enable_http2          = false
  request_timeout       = 300
  concurrency_limit     = 80

}

module "pubsub" {
  source                               = "../../modules/pubsub"
  project_id                           = var.project_id
  region                               = var.region
  pubsub_invoker_service_account_email = module.cloud_run.pubsub_invoker_service_account_email
  rag_service_account_email            = module.iam.rag_service_account_email
  message_retention_duration           = "86400s"
  ack_deadline_seconds                 = 900  # ~keep 15 minutes for RAG processing
  enable_dead_letter                   = true # ~keep Enable DLQ for better error handling

  # ~keep Specific timeouts for different subscription types
  file_indexing_ack_deadline  = 900  # ~keep 15 minutes for file processing
  url_crawling_ack_deadline   = 600  # ~keep 10 minutes for URL crawling
  rag_processing_ack_deadline = 900  # ~keep 15 minutes for RAG processing
  dlq_ack_deadline            = 1200 # ~keep 20 minutes for DLQ processing

  # ~keep Optimized retry for fanout pattern
  indexer_retry_minimum_backoff = "10s"  # ~keep Quick first retry
  indexer_retry_maximum_backoff = "600s" # ~keep Max 10 minute backoff

  indexer_url = module.cloud_run.indexer_url
  crawler_url = module.cloud_run.crawler_url
  rag_url     = module.cloud_run.rag_url
}

module "scheduler" {
  source                                  = "../../modules/scheduler"
  project_id                              = var.project_id
  region                                  = var.region
  environment                             = var.environment
  scraper_url                             = module.cloud_run.scraper_url
  scheduler_invoker_service_account_email = module.cloud_run.scheduler_invoker_service_account_email
  timezone                                = "Europe/Berlin"
}

module "monitoring" {
  source                 = "../../modules/monitoring"
  project_id             = var.project_id
  environment            = var.environment
  discord_webhook_url    = var.discord_webhook_url
  enable_uptime_checks   = false
  enable_error_reporting = true
  alert_thresholds = {
    error_rate_threshold = 0.10
    latency_threshold    = 10000
    memory_threshold     = 0.95
    cpu_threshold        = 0.90
  }
}

module "email_notifications" {
  source                    = "../../modules/email_notifications"
  project_id                = var.project_id
  region                    = var.region
  environment               = var.environment
  rag_service_account_email = module.cloud_run.rag_service_account_email
}


resource "google_bigquery_dataset" "frontend" {
  dataset_id  = "grantflow_frontend"
  description = "Frontend analytics and user data"
  location    = "US"

  default_partition_expiration_ms = 5184000000

  labels = {
    environment = var.environment
    service     = "frontend"
    managed_by  = "terraform"
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
  account_id   = "llm-api-service-account"
  display_name = "LLM API Service Account"
  description  = "Service account for accessing LLM APIs and related services"
}

resource "google_service_account" "bigquery_service" {
  account_id   = "bigquery-service"
  display_name = "BigQuery Service Account"
  description  = "Service account for BigQuery operations and Segment integration"
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

output "crdt_server_url" {
  description = "CRDT server URL"
  value       = module.cloud_run.crdt_server_url
}

module "load_balancer" {
  source             = "../../modules/load_balancer"
  project_id         = var.project_id
  region             = var.region
  environment        = var.environment
  backend_url        = module.cloud_run.backend_url
  domain             = "staging-api.grantflow.ai"
  crdt_server_domain = "staging-crdt.grantflow.ai"
  enable_ssl         = true
  enable_cdn         = false
}

output "load_balancer_ip" {
  description = "Load balancer IP address for DNS configuration"
  value       = module.load_balancer.load_balancer_ip
}

output "load_balancer_url" {
  description = "Load balancer URL for frontend configuration"
  value       = module.load_balancer.load_balancer_url
}

module "app_hosting" {
  source          = "../../modules/app_hosting"
  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  firebase_app_id = "1:362880548799:web:10d900ea35ee78c0402b0a"
  image_tag       = var.image_tag

  secret_ids = [
    "NEXT_PUBLIC_SITE_URL_STAGING",
    "NEXT_PUBLIC_BACKEND_API_BASE_URL_STAGING",
    "NEXT_PUBLIC_FIREBASE_API_KEY_STAGING",
    "NEXT_PUBLIC_FIREBASE_APP_ID_STAGING",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_STAGING",
    "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID_STAGING",
    "NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID_STAGING",
    "NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID_STAGING",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID_STAGING",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_STAGING",
    "NEXT_PUBLIC_MAILGUN_API_KEY_STAGING",
    "RESEND_API_KEY_STAGING"
  ]
}

output "app_hosting_url" {
  description = "Firebase App Hosting URL"
  value       = module.app_hosting.url
}

output "app_hosting_backend_id" {
  description = "Firebase App Hosting backend ID"
  value       = module.app_hosting.backend_id
}

