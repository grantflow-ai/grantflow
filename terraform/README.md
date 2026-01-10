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

- [OpenTofu](https://opentofu.org/) installed (version latest recommended)
- GCP credentials configured via `gcloud auth application-default login`
- Appropriate permissions in the GCP project
- (Optional) Remote state bucket for team deployments: `gs://grantflow-terraform-state`

## Usage

### Automated CI Validation (GitHub Actions)

The repository includes CI workflows that validate Terraform configuration on every pull request and push:

- **Syntax Validation**: `tofu fmt -check`
- **Configuration Validation**: `tofu validate`
- **Best Practices**: TFLint checks

These workflows do NOT deploy - they only validate. See `.github/workflows/README.md` for more information.

### Manual Deployment

#### Prerequisites for Manual Deployment

1. **Install OpenTofu**:
   ```bash
   # macOS
   brew install opentofu

   # Linux
   curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/opentofu.gpg | sudo tee /etc/apt/trusted.gpg.d/opentofu.gpg > /dev/null
   curl --proto '=https' --tlsv1.2 -fsSL https://releases.opentofu.org/opentofu/tofu-repo.deb | sudo tee /etc/apt/sources.list.d/opentofu.sources.list > /dev/null
   sudo apt-get update
   sudo apt-get install tofu
   ```

2. **Authenticate to GCP**:
   ```bash
   gcloud auth application-default login
   gcloud config set project PROJECT_ID
   ```

3. **Ensure state bucket exists** (if using remote state):
   ```bash
   gsutil mb -p PROJECT_ID gs://grantflow-terraform-state
   gsutil versioning set on gs://grantflow-terraform-state
   ```

#### Staging Environment Deployment

```bash
cd terraform/environments/staging

# Initialize with remote state backend
tofu init \
  -backend-config="bucket=grantflow-terraform-state" \
  -backend-config="prefix=staging"

# Preview changes
tofu plan -out=tfplan

# Review the plan output carefully
# Apply changes
tofu apply tfplan
```

#### Production Environment Deployment

```bash
cd terraform/environments/production

# Initialize with remote state backend
tofu init \
  -backend-config="bucket=grantflow-terraform-state" \
  -backend-config="prefix=production"

# Preview changes (production should be extra cautious)
tofu plan -out=tfplan

# Review the plan output VERY carefully
# Consider using -auto-approve=false for manual review at each step
tofu apply tfplan

# Verify changes
tofu show
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

## Firebase App Hosting Configuration

**IMPORTANT**: We use **Terraform** to manage Firebase App Hosting, NOT Firebase CLI or apphosting.yaml files.

### Key Components

Firebase App Hosting is configured using three main Terraform resources:

1. **google_firebase_app_hosting_backend**: Creates the backend service
2. **google_firebase_app_hosting_build**: Deploys container images from Artifact Registry
3. **google_firebase_app_hosting_traffic**: Allocates traffic to specific builds

### Critical Configuration Requirements

- **Environment Variables**: Configured via Secret Manager with proper IAM permissions for the service account
- **Service Account**: Must have `secretmanager.secretAccessor` role for each secret
- **Container Port**: Must use port 8080 (not 3000) for Cloud Run compatibility
- **Traffic Allocation**: Requires explicit traffic resource - builds won't serve without it
- **Build IDs**: Must be unique - use timestamps or commit hashes to prevent conflicts

### Environment Variable Security

- Never include secrets like `RESEND_API_KEY` in Docker build args
- All sensitive values must be stored in Secret Manager
- Use `NotRequired` in environment validation for build-time optional variables

### Deployment Flow

1. Docker image is built and pushed to Artifact Registry via GitHub Actions
2. Terraform creates a new build with the image tag
3. Traffic allocation resource directs 100% traffic to the new build
4. Old builds remain available but receive no traffic

### Common Issues and Solutions

- **500 errors**: Usually environment variable configuration or secret access issues
- **404 errors**: Missing traffic allocation - build exists but not serving
- **Build failures**: Check container port (must be 8080) and environment variable validation
- **Permission denied**: Ensure service account has proper Secret Manager access

### Files to Never Use

- `apphosting.yaml` - Not used in Terraform setup
- `apphosting.staging.yaml` - Not used in Terraform setup
- `apphosting.production.yaml` - Not used in Terraform setup

All configuration is managed through the `terraform/modules/app_hosting/` module.

## Adding New Resources

1. Determine which module the resource belongs to
2. Add the resource definition to the appropriate module
3. Run `tofu plan` to verify the changes
4. Run `tofu apply` to apply the changes

## Self-Hosting Guide

If you're self-hosting GrantFlow, this section provides guidance on adapting the Terraform configuration for your environment.

### Overview

The GrantFlow infrastructure is designed to run on Google Cloud Platform (GCP) using Cloud Run, Cloud SQL, and other GCP services. For self-hosting, you have two options:

1. **Migrate to GCP** (recommended for cloud-native deployments): Follow the standard deployment instructions above
2. **Adapt to your infrastructure**: Modify the Terraform modules to target your preferred platform (Docker Compose, Kubernetes, VPS, etc.)

### Adapting to Your Infrastructure

The Terraform modules are organized to be portable:

```
terraform/
├── modules/              # Platform-agnostic infrastructure definitions
│   ├── cloud_run/       # Convert to Docker/K8s deployments
│   ├── database/        # Convert to PostgreSQL on your platform
│   ├── iam/            # Convert to your auth system
│   ├── monitoring/      # Convert to your monitoring stack
│   ├── network/        # Convert to your networking
│   ├── pubsub/         # Convert to your message queue (RabbitMQ, etc.)
│   ├── scheduler/      # Convert to your job scheduler
│   ├── secrets/        # Convert to your secrets manager
│   └── storage/        # Convert to your blob storage
└── environments/        # Environment-specific values
```

### Example: Docker Compose Migration

1. **Review GCP service requirements** in the modules
2. **Create Docker Compose equivalents**:
   - `cloud_run/` → Docker services
   - `database/` → PostgreSQL service
   - `pubsub/` → RabbitMQ or similar
   - `secrets/` → Environment file or secrets management
3. **Use environment variables** from `terraform.tfvars`
4. **Document your setup** in a new `SELF_HOSTING.md`

### Key Configuration Points

When adapting the infrastructure, pay attention to:

- **Port Numbers**: Services use port 8000 (except frontend on 3000)
- **Health Checks**: Defined in modules, may need adjustment
- **Environment Variables**: Stored in Secret Manager, map to your secrets system
- **Database**: PostgreSQL 15+ with pgvector extension
- **Service Dependencies**: See module documentation for required APIs/services
- **Monitoring**: Configure logging and metrics for your platform
- **State Management**: If not using GCS, modify backend configuration

### Self-Hosting Checklist

- [ ] Choose your infrastructure platform (Docker Compose, Kubernetes, VPS, etc.)
- [ ] Install and configure required services (PostgreSQL, Redis, etc.)
- [ ] Adapt Terraform modules for your platform or create Docker Compose configs
- [ ] Set up secrets management (environment files, vault, etc.)
- [ ] Configure networking and reverse proxy (Nginx, Traefik, etc.)
- [ ] Set up monitoring and logging (Prometheus, ELK, etc.)
- [ ] Test deployment in staging environment first
- [ ] Document your setup for future maintainers
- [ ] Set up automated backups for databases
- [ ] Configure SSL/TLS certificates

### Community Resources

For deployment examples and discussions:
- Check GitHub Discussions for self-hosting setups
- See `.github/workflows/README.md` for CI/validation workflows
- Reference the existing modules for configuration requirements

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test with `tofu plan`
4. Submit a pull request
5. If adding new infrastructure, update this README with self-hosting guidance

## Notes

- The configuration uses the OpenTofu provider (fork of Terraform)
- Required Google Cloud APIs must be enabled before applying
- All Cloud Run services have resource limits defined for CPU and memory
- Scaling parameters are configured for each service
- For self-hosting, adapt these configurations to your platform's requirements
