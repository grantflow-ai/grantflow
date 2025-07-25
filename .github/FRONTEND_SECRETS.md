# Frontend GitHub Secrets Configuration

This document lists all the GitHub secrets required for the frontend build and deployment pipeline.

## Required GitHub Secrets

The following secrets must be configured in the GitHub repository settings for the frontend CI/CD pipeline to work correctly:

### Core Secrets (Used for Docker Build)

These secrets are used during the Docker build process and should contain the actual values (not environment-specific):

1. **RESEND_API_KEY** - Resend API key for email functionality
2. **NEXT_PUBLIC_FIREBASE_API_KEY** - Firebase API key
3. **NEXT_PUBLIC_FIREBASE_APP_ID** - Firebase App ID
4. **NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN** - Firebase Auth domain
5. **NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID** - Firebase Analytics measurement ID
6. **NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID** - Firebase messaging sender ID
7. **NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID** - Microsoft tenant ID for Firebase Auth
8. **NEXT_PUBLIC_FIREBASE_PROJECT_ID** - Firebase project ID
9. **NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET** - Firebase storage bucket
10. **NEXT_PUBLIC_SITE_URL** - The site URL (e.g., https://grantflow.ai)

### Backend API URLs

The backend API URLs are set dynamically in the workflow based on the branch:
- **Development/Staging**: `https://staging-api.grantflow.ai`
- **Production**: `https://api.grantflow.ai`

### Discord Notifications

11. **DISCORD_WEBHOOK_URL** - Discord webhook for deployment notifications

## Firebase App Hosting Secrets

Firebase App Hosting uses Google Secret Manager with environment-specific suffixes. These are managed by Terraform and include:

- Staging secrets: `{SECRET_NAME}_STAGING`
- Production secrets: `{SECRET_NAME}_PRODUCTION`

The apphosting.yaml files reference these secrets, which are stored in Google Secret Manager, not GitHub.

## Important Notes

1. The GitHub secrets should contain the production values by default
2. The backend API URL is set dynamically in the workflow based on the branch
3. Firebase App Hosting will use the appropriate environment-specific secrets from Google Secret Manager
4. The Docker build uses these secrets as build arguments to compile the Next.js application

## Setting Secrets

To set these secrets in GitHub:

1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with its corresponding value
4. Ensure all secrets are properly set before running the workflow