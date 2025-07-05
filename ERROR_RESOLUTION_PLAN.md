# Firebase App Hosting Error Resolution Plan

## **Phase 1: Immediate Error Assessment** ⚡

### 1. Access Current Errors (DO THIS FIRST)
```bash
# Method 1: Firebase Console (Recommended)
open "https://console.firebase.google.com/project/grantflow/apphosting/monorepo"
# Navigate to: Logs tab → Filter by "Error" severity → Last 7 days

# Method 2: Cloud Console
open "https://console.cloud.google.com/logs/query?project=grantflow"
# Use this query:
```
```
resource.type="cloud_run_revision"
resource.labels.service_name="monorepo"
severity>=ERROR
timestamp>="2024-12-28T00:00:00Z"
```

### 2. Categorize Errors by Priority

**🚨 CRITICAL (Fix Immediately)**
- Application crashes/won't start
- 5xx HTTP errors affecting users
- Out of memory (OOM) errors
- Database connection failures
- Environment variable missing errors

**⚠️ HIGH (Fix Within 24h)**
- Performance degradation
- Memory usage > 80%
- Timeout errors
- External service failures

**🔍 MEDIUM (Fix Within Week)**
- Warning-level logs
- Non-critical feature failures
- Performance optimizations

## **Phase 2: Fix Critical Errors First** 🔧

### Common App Hosting Issues & Solutions

#### **Environment Variables Missing**
```bash
# Check current env vars
firebase apphosting:secrets:list --project=grantflow

# Add missing variables (example)
firebase apphosting:secrets:set RESEND_API_KEY --project=grantflow
# Enter: ***REDACTED_RESEND_KEY***
```

#### **Database Connection Issues**
```bash
# Check Cloud SQL proxy status
gcloud sql instances describe grantflow-db --project=grantflow

# Verify connection strings in env
firebase apphosting:secrets:describe DATABASE_URL --project=grantflow
```

#### **Memory/Performance Issues**
```yaml
# Update apphosting.yaml if needed
runConfig:
  minInstances: 1      # Prevent cold starts
  maxInstances: 10
  cpu: 2               # Increase if needed
  memoryMiB: 2048      # Increase from 1024 if OOM errors
  concurrency: 100
```

#### **Build/Deployment Failures**
```bash
# Check build logs
firebase apphosting:builds:list monorepo --project=grantflow

# Redeploy if needed
git push origin main  # Triggers auto-deploy
```

## **Phase 3: Set Up Comprehensive Monitoring** 📊

### 1. Update Discord Webhook (REQUIRED)
```bash
# Get new Discord webhook URL from your Discord server
# Settings → Integrations → Webhooks → Create Webhook
# Update terraform/terraform.tfvars:
discord_webhook_url = "YOUR_NEW_WEBHOOK_URL"
```

### 2. Deploy Enhanced Monitoring
```bash
cd terraform
tofu plan -var-file="staging.tfvars"
tofu apply -var-file="staging.tfvars"
```

### 3. Test Monitoring System
```bash
# This will send a test alert to Discord
python test_monitoring_system.py
```

## **Phase 4: Ongoing Monitoring Setup** 🎯

### Alerts We'll Set Up:
1. **Error Rate > 5/minute** → Immediate Discord notification
2. **Memory Usage > 80%** → Warning notification
3. **Deployment Failures** → Immediate notification
4. **Response Time > 5s** → Performance warning
5. **4xx Error Rate Spike** → User experience warning

### Log Queries for Manual Monitoring:
```
# All errors in last 24h
resource.type="cloud_run_revision" AND resource.labels.service_name="monorepo" AND severity>=ERROR AND timestamp>="2025-01-03T00:00:00Z"

# Memory issues
resource.type="cloud_run_revision" AND resource.labels.service_name="monorepo" AND (textPayload=~"out of memory" OR textPayload=~"OOM")

# Database issues
resource.type="cloud_run_revision" AND resource.labels.service_name="monorepo" AND textPayload=~"database|connection|sql"

# Performance issues
resource.type="cloud_run_revision" AND resource.labels.service_name="monorepo" AND (textPayload=~"timeout" OR textPayload=~"slow")
```

## **Phase 5: Create Error Response Runbook** 📋

### When Discord Alert Fires:

1. **Acknowledge**: React to Discord message with ✅
2. **Assess**: Check Firebase/Cloud console links in alert
3. **Categorize**: Critical/High/Medium priority
4. **Fix**: Apply appropriate solution from this guide
5. **Verify**: Check logs to confirm fix worked
6. **Document**: Update this runbook if new issue type

### Emergency Contacts:
- **App Hosting Console**: https://console.firebase.google.com/project/grantflow/apphosting/monorepo
- **Cloud Logs**: https://console.cloud.google.com/logs/query?project=grantflow
- **Monitoring Dashboard**: https://console.cloud.google.com/monitoring?project=grantflow

---

## **Next Steps** ✅

1. **FIRST**: Manually check Firebase App Hosting logs for current errors
2. **Get new Discord webhook** URL and update terraform config
3. **Deploy monitoring** with `tofu apply`
4. **Fix any critical errors** found in logs
5. **Test monitoring** with provided scripts
6. **Set up regular log reviews** (daily/weekly)

This systematic approach ensures we catch and fix errors proactively rather than reactively.