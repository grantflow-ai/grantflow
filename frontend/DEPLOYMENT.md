# Firebase App Hosting Deployment Setup

This document outlines the multi-environment deployment setup for Firebase App Hosting.

## Environment Structure

### Projects
- **Production**: `grantflow` - Main production environment
- **Staging**: `grantflow-staging` - Development and testing environment

### Configuration Files
- `apphosting.yaml` - Base configuration (fallback)
- `apphosting.staging.yaml` - Staging environment overrides
- `apphosting.production.yaml` - Production environment overrides

## Environment Differences

### Staging (`apphosting.staging.yaml`)
- **Resources**: 1 CPU, 512MB RAM, max 5 instances
- **Mock Features**: NEXT_PUBLIC_MOCK_API=true, NEXT_PUBLIC_MOCK_AUTH=true
- **Secrets**: All secrets have `_STAGING` suffix
- **Cost**: Optimized for low cost during development

### Production (`apphosting.production.yaml`)
- **Resources**: 4 CPU, 2GB RAM, max 100 instances, min 1 instance
- **Mock Features**: Disabled (false)
- **Secrets**: Production secrets without suffix
- **Performance**: Optimized for production load

## Deployment Commands

### Using the Deployment Script
```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

### Manual Deployment
```bash
# Deploy to staging
firebase use staging
firebase deploy

# Deploy to production
firebase use production
firebase deploy
```

## Setup Steps

### 1. Complete Staging Project Setup
The staging project `grantflow-staging` needs to be upgraded to Blaze plan:
- Visit: https://console.firebase.google.com/project/grantflow-staging/usage/details
- Upgrade to Blaze (pay-as-you-go) plan
- Enable App Hosting API

### 2. Create App Hosting Backends
```bash
# Create staging backend
firebase apphosting:backends:create --project grantflow-staging

# Verify production backend exists
firebase apphosting:backends:list --project grantflow
```

### 3. Set Up Secrets
Create staging-specific secrets in the staging project:
```bash
firebase use staging

# Set staging secrets (example)
firebase apphosting:secrets:set NEXT_PUBLIC_SITE_URL_STAGING
firebase apphosting:secrets:set NEXT_PUBLIC_BACKEND_API_BASE_URL_STAGING
# ... (repeat for all staging secrets)
```

### 4. Configure Branch-Based Deployments
In Firebase Console for each backend:
1. Go to App Hosting → Deployment settings
2. Set live branch:
   - Staging backend: `development` branch
   - Production backend: `main` branch

### 5. Set Environment Names
In Firebase Console for each backend:
1. Go to App Hosting → Settings → Environment
2. Set environment name:
   - Staging backend: "staging"
   - Production backend: "production"

## Branch Strategy

- **development** branch → Staging environment
- **main** branch → Production environment

## Mock Features in Staging

The staging environment has mock API and auth enabled by default:
- `NEXT_PUBLIC_MOCK_API=true` - Enables mock API responses
- `NEXT_PUBLIC_MOCK_AUTH=true` - Bypasses Firebase authentication

This allows for testing without real backend dependencies.

## Firebase Project Aliases

Configured in `.firebaserc`:
```json
{
  "projects": {
    "default": "grantflow",
    "production": "grantflow",
    "staging": "grantflow-staging"
  }
}
```

## Next Steps

1. ✅ Create staging Firebase project
2. ⏳ Upgrade staging project to Blaze plan
3. ⏳ Create App Hosting backend for staging
4. ⏳ Set up staging secrets
5. ⏳ Configure branch-based deployments
6. ⏳ Test deployments to both environments