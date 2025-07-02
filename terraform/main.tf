provider "google" {
  project                     = var.project_id
  region                      = var.region
  zone                        = var.zone
  user_project_override       = true
  billing_project             = var.project_id
}

provider "google-beta" {
  project                     = var.project_id
  region                      = var.region
  zone                        = var.zone
  user_project_override       = true
  billing_project             = var.project_id
}

terraform {
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
  required_version = ">= 1.0.0"
}


module "network" {
  source     = "./modules/network"
  project_id = var.project_id
  region     = var.region
}


module "cloud_run" {
  source                   = "./modules/cloud_run"
  project_id               = var.project_id
  region                   = var.region
  environment              = var.environment
  database_connection_name = module.database.instance_connection_name
}


module "pubsub" {
  source                               = "./modules/pubsub"
  project_id                           = var.project_id
  region                               = var.region
  pubsub_invoker_service_account_email = module.cloud_run.pubsub_invoker_service_account_email
}


module "storage" {
  source              = "./modules/storage"
  bucket_name         = var.storage_bucket_name
  environment         = var.environment
  file_indexing_topic = module.pubsub.file_indexing_topic_id
}


module "iam" {
  source = "./modules/iam"
}


module "secrets" {
  source     = "./modules/secrets"
  project_id = var.project_id
}


module "database" {
  source     = "./modules/database"
  project_id = var.project_id
  region     = var.region
  zone       = var.database_zone
  network_id = module.network.network_id


  authorized_networks = var.database_authorized_networks
}


module "scheduler" {
  source                                  = "./modules/scheduler"
  project_id                              = var.project_id
  region                                  = var.region
  environment                             = var.environment
  scraper_url                             = module.cloud_run.scraper_url
  scheduler_invoker_service_account_email = module.cloud_run.scheduler_invoker_service_account_email
}

module "monitoring" {
  source                = "./modules/monitoring"
  project_id            = var.project_id
  environment           = var.environment
  discord_webhook_url   = var.discord_webhook_url
  monthly_budget_amount = var.monthly_budget_amount
}