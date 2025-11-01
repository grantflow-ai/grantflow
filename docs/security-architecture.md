# Security Architecture & Best Practices

## Overview

GrantFlow follows defense-in-depth security principles with multiple layers of protection across infrastructure, application, and operational domains.

## Authentication & Authorization

### User Authentication
- **Firebase Authentication** as primary identity provider
- Support for multiple authentication methods:
  - Email/password with OTP verification
  - Google OAuth
  - Microsoft OAuth (for enterprise clients)
- JWT tokens with short expiration (1 hour)
- Refresh token rotation

### Service Authentication
- **Service Accounts** for service-to-service communication
- **Workload Identity Federation** for GitHub Actions (no long-lived credentials)
- **Application Default Credentials** for local development

### Authorization Model
- **Organization-based multi-tenancy**
- **Role-based access control (RBAC)**:
  - OWNER: Full organization control
  - ADMIN: Project and member management
  - COLLABORATOR: Project access (configurable)
- **URL-scoped authorization** via middleware
- **Project-level access control** for fine-grained permissions

## Infrastructure Security

### Network Security
- **Private VPC** with custom subnets
- **Private IP** for Cloud SQL (no public internet exposure)
- **VPC Service Controls** for API access boundaries
- **Cloud Armor** security policies on load balancer
- **SSL/TLS everywhere** with managed certificates

### Secret Management
- **Google Secret Manager** for all sensitive configuration
- **KMS encryption** for secrets at rest
- **Service-specific access** to secrets
- **No hardcoded credentials** in code or configuration
- **GitHub Secrets** for CI/CD variables

### Storage Security
- **Customer-managed encryption keys (CMEK)** for GCS buckets
- **Signed URLs** for temporary file access (15-minute expiration)
- **Bucket-level IAM** with least privilege
- **Lifecycle policies** to remove old data
- **Audit logging** for all bucket access

## Application Security

### Input Validation
- **Type validation** with msgspec and TypedDict
- **SQL injection prevention** via SQLAlchemy ORM
- **XSS protection** in React with proper escaping
- **File upload validation**:
  - Type checking
  - Size limits (100MB default)
  - Virus scanning (planned)

### API Security
- **Rate limiting** per user/organization
- **Request size limits** (10MB default)
- **CORS configuration** with explicit origins
- **Content Security Policy (CSP)** headers
- **API versioning** for backward compatibility

### Data Protection
- **Encryption at rest** for all databases
- **Encryption in transit** with TLS 1.3
- **PII handling**:
  - Minimal data collection
  - Data retention policies
  - Right to deletion (GDPR)
- **Audit logging** for sensitive operations

### Automated Data Cleanup
- **Entity Cleanup Webhook** (`/webhooks/scheduler/entity-cleanup`):
  - Triggered daily at 2 AM UTC via Cloud Scheduler HTTP target
  - 10-day grace period for soft-deleted users
  - 30-day grace period for soft-deleted organizations
  - Hard deletes from Firebase Auth and database after grace period
  - Monitoring alerts for webhook failures
- **Soft Delete Pattern**:
  - Users/organizations marked with `deleted_at` timestamp
  - Grace period allows recovery if needed
  - Automated cleanup ensures GDPR compliance

## CI/CD Security

### Supply Chain Security
- **Dependency scanning** with Dependabot
- **Container scanning** with Trivy
- **SBOM generation** for releases
- **Pinned action versions** in workflows
- **Code signing** for releases (planned)

### Deployment Security
- **Blue-green deployments** with health checks
- **Automated rollback** on failures
- **Environment isolation** (staging/production)
- **Approval gates** for production deployments
- **Audit trail** of all deployments

## Operational Security

### Monitoring & Alerting
- **Security event monitoring** with Cloud Logging
- **Alert policies** for suspicious activity:
  - Failed authentication attempts
  - Unusual API usage patterns
  - Service account anomalies
- **Discord notifications** for security alerts
- **OpenTelemetry tracing** for request tracking

### Incident Response
- **Automated alerting** via Discord
- **Runbook documentation** for common incidents
- **Rollback procedures** for all services
- **Data backup and recovery** procedures
- **Post-incident reviews** and documentation

### Access Control
- **GitHub branch protection** rules
- **Required PR reviews** for main branch
- **Admin bypass disabled**
- **2FA required** for all contributors
- **Regular access audits** (quarterly)

## Compliance & Privacy

### Data Privacy
- **GDPR compliance**:
  - Privacy policy
  - Data processing agreements
  - Right to access/delete data
- **Data minimization** principles
- **Purpose limitation** for data use
- **Consent management** for data processing

### Audit & Compliance
- **Cloud Audit Logs** for all GCP resources
- **Application audit logs** for user actions
- **Compliance reporting** capabilities
- **Regular security assessments**
- **Penetration testing** (annual)

## Security Checklist

### Development
- [ ] No hardcoded secrets or credentials
- [ ] Input validation on all user inputs
- [ ] Parameterized queries (no SQL concatenation)
- [ ] Proper error handling (no stack traces to users)
- [ ] Security headers configured

### Deployment
- [ ] Secrets stored in Secret Manager
- [ ] Service accounts with least privilege
- [ ] Network policies configured
- [ ] SSL/TLS certificates valid
- [ ] Health checks implemented

### Operations
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested
- [ ] Incident response plan documented
- [ ] Access reviews completed
- [ ] Security patches applied

## Security Contacts

- **Security Issues**: security@grantflow.ai
- **Bug Bounty**: https://grantflow.ai/security
- **Emergency Contact**: Use Discord #security channel

## Common Security Patterns

### Secure API Endpoint
```python
@post("/organizations/{organization_id:uuid}/data",
      allowed_roles=[UserRoleEnum.ADMIN])
async def create_data(
    organization_id: UUID,
    data: ValidatedInput,  # Type-validated input
    user: AuthenticatedUser,  # From middleware
    session_maker: AsyncSession
) -> SecureResponse:
    # Authorization already handled by middleware
    # Input already validated by msgspec
    # Just implement business logic
```

### Secure File Upload
```python
# Signed URL generation with expiration
signed_url = create_signed_upload_url(
    bucket_name="grantflow-staging-uploads",
    object_name=f"{org_id}/{file_id}/{filename}",
    content_type=content_type,
    expiration_minutes=15  # Short-lived URLs
)
```

### Secret Access Pattern
```python
# Never hardcode, always use Secret Manager
api_key = get_secret("EXTERNAL_API_KEY")
# Or environment variables for runtime config
api_url = get_env("API_URL", fallback="https://default.api.com")
```

## Security Tools

### Static Analysis
- **Trivy**: Infrastructure and container scanning
- **Bandit**: Python security linting
- **ESLint Security Plugin**: JavaScript security rules
- **CodeQL**: GitHub Advanced Security scanning

### Runtime Protection
- **Cloud Armor**: DDoS and application protection
- **Cloud KMS**: Encryption key management
- **VPC Service Controls**: API access boundaries
- **Binary Authorization**: Container image verification

## Recent Security Improvements

1. **Removed hardcoded Discord webhook** from workflows (moved to GitHub Secrets)
2. **Implemented fanout pattern** for rate limit protection
3. **Added OpenTelemetry** for security observability
4. **Migrated to Workload Identity Federation** (removed service account keys)
5. **Implemented organization-based multi-tenancy** for data isolation

## Future Security Enhancements

1. **Implement rate limiting** at API Gateway level
2. **Add virus scanning** for file uploads
3. **Implement code signing** for releases
4. **Add security scanning** to CI pipeline
5. **Implement key rotation** automation
6. **Add penetration testing** program
7. **Implement WAF rules** in Cloud Armor
8. **Add data loss prevention (DLP)** scanning

---

*Last Updated: January 2025*
*Security Review: Quarterly*
*Next Review: April 2025*
