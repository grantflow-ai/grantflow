# Firebase Auth Blocking Functions - Deployment Guide

## Overview
This directory contains Firebase Auth blocking functions that prevent registration and login for users who don't have a @grantflow.ai email address.

## Functions
- `beforeCreate` - Blocks user registration for non-grantflow.ai emails
- `beforeSignIn` - Blocks user sign-in for non-grantflow.ai emails

## Prerequisites
1. Firebase project must be upgraded to Firebase Authentication with Identity Platform
2. Firebase CLI must be installed and authenticated
3. Python dependencies must be installed (see requirements.txt)

## Deployment Steps

### 1. Authentication
```bash
# Re-authenticate with Firebase if needed
firebase login --reauth

# Set the project to staging
cd frontend
firebase use staging
```

### 2. Deploy Functions
```bash
# Deploy the functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:beforeCreate,beforeSignIn
```

### 3. Register Blocking Functions
After deployment, you must register the blocking functions in the Firebase Console:

1. Go to Firebase Console → Authentication → Settings
2. Click on "Blocking functions" tab
3. Select "beforeCreate" and "beforeSignIn" from the dropdown
4. Click "Save"

**⚠️ Important**: If you delete a function, you must also unregister the triggers with Firebase Authentication. Failure to do so will prevent all users from authenticating with your app.

## Testing
Once deployed and registered, test the blocking functions:

1. Try registering with a non-grantflow.ai email (should be blocked)
2. Try registering with a grantflow.ai email (should succeed)
3. Try signing in with a non-grantflow.ai email (should be blocked)
4. Try signing in with a grantflow.ai email (should succeed)

## Monitoring
- Check Firebase Console → Functions for deployment status
- Check Firebase Console → Authentication → Users for blocked attempts
- Monitor Cloud Logging for function execution logs

## Configuration
The functions are configured for:
- Region: us-central1
- Timeout: 7 seconds (Firebase requirement)
- Memory: 256MB

## Environment
- Staging: grantflow-staging Firebase project
- Production: grantflow Firebase project (when ready)