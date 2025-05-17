#!/bin/bash
set -e

echo "Initializing Terraform..."
tofu init

# Uncomment the next lines if you want to import existing resources later
# echo "Importing existing resources..."
# tofu import module.network.google_compute_network.default default
# tofu import module.network.google_compute_subnetwork.default projects/grantflow/regions/us-central1/subnetworks/default
# tofu import module.storage.google_storage_bucket.uploads grantflow-uploads
# tofu import module.pubsub.google_pubsub_topic.file_indexing projects/grantflow/topics/file-indexing

echo "Running plan to verify configuration..."
tofu plan

echo "Initialization complete. To apply changes, run: tofu apply"
