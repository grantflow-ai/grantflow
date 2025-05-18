# GrantFlow Infrastructure as Code

This directory contains OpenTofu configuration for managing GrantFlow's Google Cloud Platform infrastructure.

## Structure

The configuration is organized into modules:

- `modules/cloud_run`: Cloud Run services for the backend, crawler, and indexer
- `modules/database`: CloudSQL PostgreSQL database
- `modules/iam`: Service accounts and IAM permissions
- `modules/network`: VPC network and subnetworks
- `modules/pubsub`: Pub/Sub topics and subscriptions
- `modules/secrets`: Secret Manager secrets
- `modules/storage`: GCS buckets and permissions

## Prerequisites

- [OpenTofu](https://opentofu.org/) installed
- GCP credentials configured via `gcloud auth application-default login`
- Appropriate permissions in the GCP project

## Usage

### Initialization

```bash
tofu init
```

### Planning Changes

To see what changes will be applied:

```bash
tofu plan
```

### Applying Changes

To apply the changes:

```bash
tofu apply
```

### Handling Lock Issues

If you encounter a state lock issue, you can force unlock it using the lock ID from the error message:

```bash
tofu force-unlock -force LOCK_ID
```

### Importing Existing Resources

When you need to import existing resources that were created outside of Terraform:

```bash
# Example: Import a Cloud Run service
tofu import module.cloud_run.google_cloud_run_v2_service.backend projects/PROJECT_ID/locations/REGION/services/backend

# Example: Import a database
tofu import module.database.google_sql_database.postgres projects/PROJECT_ID/instances/INSTANCE_NAME/databases/postgres
```

## State Management

OpenTofu state is stored in the `grantflow-terraform-state` GCS bucket.

## Cloud Run Services Configuration

All services:

- Use port 8000 instead of default 8080
- Have liveness probes configured to check the `/health` endpoint
- Connect to CloudSQL via the CloudSQL Auth Proxy

## Adding New Resources

1. Determine which module the resource belongs to
2. Add the resource definition to the appropriate module
3. Run `tofu plan` to verify the changes
4. Run `tofu apply` to apply the changes

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test with `tofu plan`
4. Submit a pull request

## Notes

- The configuration uses the OpenTofu provider (fork of Terraform)
- Required Google Cloud APIs must be enabled before applying
- All Cloud Run services have resource limits defined for CPU and memory
- Scaling parameters are configured for each service
