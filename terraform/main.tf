provider "google" {
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
  }
  required_version = ">= 1.0.0"
}

# Network Module
module "network" {
  source     = "./modules/network"
  project_id = var.project_id
  region     = var.region
}

# Storage Module
module "storage" {
  source      = "./modules/storage"
  bucket_name = var.storage_bucket_name
  environment = var.environment
}

# IAM Module
module "iam" {
  source = "./modules/iam"
}

# PubSub Module
module "pubsub" {
  source = "./modules/pubsub"
}

# Cloud Run Module
module "cloud_run" {
  source                   = "./modules/cloud_run"
  project_id               = var.project_id
  region                   = var.region
  database_connection_name = module.database.instance_connection_name
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
