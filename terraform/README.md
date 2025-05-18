# GrantFlow Infrastructure as Code

This directory contains Terraform configuration for managing GrantFlow's Google Cloud Platform infrastructure.

## Structure

The configuration is organized into modules:

- `modules/artifact_registry`: Docker container repositories
- `modules/cloud_run`: Cloud Run services
- `modules/iam`: Service accounts and IAM permissions
- `modules/network`: VPC network and subnetworks
- `modules/pubsub`: Pub/Sub topics and subscriptions
- `modules/secret_manager`: Secret Manager secrets
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

### Importing Existing Resources

If you need to import existing resources, uncomment the appropriate lines in `init.sh` and run it again.

## State Management

Terraform state is stored in the `grantflow-terraform-state` GCS bucket.

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

- The `terraform` directory was initially populated using Terraformer
- Configuration has been modularized for better organization and maintainability
- Required Google Cloud APIs must be enabled before applying
