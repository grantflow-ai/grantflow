# Branch Protection Rules for CD

## Development Branch Protection

Configure these settings in GitHub → Settings → Branches → Add rule for `development`:

### Required status checks
- [x] Require status checks to pass before merging
- [x] Require branches to be up to date before merging

Required checks:
- `Frontend Tests`
- `Backend Tests` 
- `Crawler Tests`
- `Indexer Tests`
- `RAG Tests`
- `Scraper Tests`
- `Terraform Validate`

### Deploy Status Checks (after CD is enabled)
- `deploy / deploy (backend)`
- `deploy / deploy (crawler)`
- `deploy / deploy (indexer)`
- `deploy / deploy (rag)`
- `deploy / deploy (scraper)`

### Additional Settings
- [x] Require pull request reviews before merging (1 approval)
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Include administrators (optional for emergency fixes)
- [x] Require linear history (prevents merge commits)

## Main Branch Protection

Same as development, plus:
- [x] Require pull request reviews before merging (2 approvals)
- [x] Restrict who can push to matching branches (only admins)

## Deployment Environments

Create these in Settings → Environments:

### staging
- Deployment branches: `development`
- Environment secrets:
  - `DISCORD_WEBHOOK_URL`
- No required reviewers (auto-deploy)

### production  
- Deployment branches: `main`
- Environment secrets:
  - `DISCORD_WEBHOOK_URL`
- Required reviewers: 1 (for manual approval)