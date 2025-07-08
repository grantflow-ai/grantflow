# GrantFlow Infrastructure as Code

This directory contains OpenTofu configuration for managing GrantFlow's Google Cloud Platform infrastructure.

## Directory Structure

```
terraform/
├── environments/          # Environment-specific configurations
│   ├── staging/          # Staging environment
│   │   ├── main.tf       # Main configuration for staging
│   │   ├── variables.tf  # Variable definitions
│   │   ├── outputs.tf    # Output definitions
│   │   ├── backend.tf    # Backend configuration
│   │   └── terraform.tfvars # Staging-specific values
│   └── production/       # Production environment
│       ├── main.tf       # Main configuration for production
│       ├── variables.tf  # Variable definitions
│       ├── outputs.tf    # Output definitions
│       ├── backend.tf    # Backend configuration
│       └── terraform.tfvars # Production-specific values
├── modules/              # Reusable modules
│   ├── cloud_run/       # Cloud Run service deployments
│   ├── database/        # Cloud SQL configurations
│   ├── iam/            # IAM and service accounts
│   ├── monitoring/      # Monitoring and alerting
│   ├── network/        # VPC and networking
│   ├── pubsub/         # Pub/Sub topics and subscriptions
│   ├── scheduler/      # Cloud Scheduler jobs
│   ├── secrets/        # Secret Manager
│   └── storage/        # Cloud Storage buckets
└── global/             # Global resources (shared across environments)
    └── backend.tf      # Terraform state bucket configuration
```

## Cost Optimization by Environment

### Staging Environment
- **Database**: db-f1-micro (shared CPU, 0.6GB RAM, 10GB HDD)
- **Cloud Run**: Minimal instances (0-1), 512Mi memory
- **Storage**: STANDARD class, 7-day retention
- **Monitoring**: Basic alerts only
- **Estimated cost**: ~$50-100/month

### Production Environment
- **Database**: db-custom-2-8192 (2 vCPUs, 8GB RAM, 100GB SSD)
- **Cloud Run**: Auto-scaling (0-100), 2Gi memory
- **Storage**: STANDARD class with lifecycle policies
- **Monitoring**: Comprehensive alerts and logging
- **Estimated cost**: ~$300-500/month

## Prerequisites

- [OpenTofu](https://opentofu.org/) installed
- GCP credentials configured via `gcloud auth application-default login`
- Appropriate permissions in the GCP project

## Usage

### Staging Environment

```bash
cd environments/staging
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

### Production Environment

```bash
cd environments/production
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

### Working with Modules Directly (Development Only)

For testing individual modules:

```bash
cd modules/database
tofu init
tofu plan -var="project_id=grantflow" -var="environment=staging"
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

Each environment maintains its own Terraform state in GCS:
- **Staging**: `gs://grantflow-terraform-state/staging/default.tfstate`
- **Production**: `gs://grantflow-terraform-state/production/default.tfstate`
- **Global**: `gs://grantflow-terraform-state/global/default.tfstate`

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
