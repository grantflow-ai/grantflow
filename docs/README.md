# GrantFlow Documentation

## Overview
GrantFlow.AI is a grant application management platform that leverages AI to streamline the grant writing process. This documentation provides comprehensive information for developers, operators, and stakeholders.

## Documentation Structure

### 📚 Technical Documentation
- [Cloud Architecture](./cloud-architecture.md) - System design and infrastructure
- [CI/CD Architecture](./ci-cd-architecture.md) - Build, test, and deployment pipelines
- [API Reference](./api.md) - Backend API endpoints and contracts
- [Database Schema](./database.md) - Data models and relationships
- [Services Overview](./services.md) - Microservices architecture and responsibilities

### 🔧 Operations
- [Infrastructure](./infrastructure.md) - Cloud resources and Terraform modules
- [Monitoring & Alerts](./monitoring.md) - Observability and incident response
- [Deployment Guide](./deployment.md) - Deployment procedures and rollback

### 🔒 Security & Compliance
- [Security Architecture](./security-architecture.md) - Comprehensive security measures and best practices
- [Data Privacy](./data-privacy.md) - GDPR compliance and data handling

### 📊 Business & Product
- [Product Overview](./product.md) - Features and user journeys
- [Technical Decisions](./decisions.md) - ADRs and technical choices

## Quick Links

- **Production URL**: https://grantflow.ai
- **Staging URL**: https://staging--grantflow-staging.us-central1.hosted.app
- **GitHub**: https://github.com/grantflow-ai/monorepo
- **Project Board**: [GitHub Projects](https://github.com/orgs/grantflow-ai/projects)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Python 3.13, Litestar, SQLAlchemy, PostgreSQL
- **Infrastructure**: Google Cloud Platform, OpenTofu (Terraform)
- **AI/ML**: OpenAI, Anthropic, Google Vertex AI
- **Services**: Cloud Run, Pub/Sub, Cloud SQL, Firebase

## Key Contacts

- **Engineering Lead**: @naaman
- **Discord**: [Team Channel](https://discord.com/channels/...)

## Documentation Standards

All documentation follows these principles:
- Keep it concise and actionable
- Include examples where applicable
- Update when code changes
- Review quarterly for accuracy

Last Updated: January 2025