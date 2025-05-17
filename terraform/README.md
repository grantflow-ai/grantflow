# GrantFlow Infrastructure as Code

This directory contains Terraform configuration for managing GrantFlow's Google Cloud Platform infrastructure.

## Structure

The configuration is organized into modules:

- `modules/network`: VPC network and subnetworks
- `modules/storage`: GCS buckets and permissions
- `modules/iam`: Service accounts and IAM permissions
- `modules/pubsub`: Pub/Sub topics and subscriptions

## Prerequisites

- [OpenTofu](https://opentofu.org/) installed
- GCP credentials configured via `gcloud auth login`
- Appropriate permissions in the GCP project

## Usage

### Initialization

Run the initialization script to set up Terraform:

```bash
./init.sh
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
