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

# Network Module
module "network" {
  source     = "./modules/network"
  project_id = var.project_id
  region     = var.region
}

# Cloud Run Module (moved up to make the service account available)
module "cloud_run" {
  source                   = "./modules/cloud_run"
  project_id               = var.project_id
  region                   = var.region
  database_connection_name = module.database.instance_connection_name
  valkey_connection_string = module.memorystore.connection_string
}

# PubSub Module
module "pubsub" {
  source                               = "./modules/pubsub"
  project_id                           = var.project_id
  region                               = var.region
  pubsub_invoker_service_account_email = module.cloud_run.pubsub_invoker_service_account_email
}

# Storage Module - configured to send notifications to PubSub
module "storage" {
  source              = "./modules/storage"
  bucket_name         = var.storage_bucket_name
  environment         = var.environment
  file_indexing_topic = module.pubsub.file_indexing_topic_id
}

# IAM Module
module "iam" {
  source = "./modules/iam"
}

# Memorystore Module
module "memorystore" {
  source     = "./modules/memorystore"
  project_id = var.project_id
  region     = var.region
  network_id = module.network.network_id
  depends_on = [module.network]
}


# Secrets Module
module "secrets" {
  source     = "./modules/secrets"
  project_id = var.project_id
}

# Database Module
module "database" {
  source     = "./modules/database"
  project_id = var.project_id
  region     = var.region
  zone       = var.database_zone
  network_id = module.network.network_id

  # Pass the authorized networks from variables
  authorized_networks = var.database_authorized_networks
}
