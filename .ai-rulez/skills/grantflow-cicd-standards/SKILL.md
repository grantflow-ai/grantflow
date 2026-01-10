---
priority: medium
---

# CI/CD Pipeline Standards

**GitHub Actions · Build → Deploy · Multi-stage · Quality gates · No AI signatures**

- Workflows: .github/workflows/ with reusable patterns
- Stages: Validate (prek) → Build → Test → Deploy
- Development: development branch → staging (us-central1)
- Production: main branch → production (europe-west3)
- Services: independently deployable via build-service-*.yaml
- Quality gates: zero warnings, tests pass, coverage thresholds met
- Docker: multi-stage builds, minimal base images, platform linux/amd64
- sync-services.yaml: runs every 5 minutes, ensures deploy within 5 min of build
- Commits: conventional format (feat:/fix:/chore:), NEVER include AI signatures
