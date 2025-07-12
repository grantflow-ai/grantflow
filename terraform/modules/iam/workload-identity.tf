resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github"
  display_name              = "github"
  description               = "Workload Identity Pool for GitHub Actions"

  lifecycle {
    ignore_changes = all
  }
}

resource "google_iam_workload_identity_pool_provider" "github_actions" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions-pool"
  display_name                       = "github-actions-provider"
  description                        = "OIDC provider for GitHub Actions"

  attribute_condition = "assertion.repository_owner == 'grantflow-ai'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }

  lifecycle {
    ignore_changes = all
  }
}

# Bind the GitHub Actions service account to the workload identity pool
resource "google_service_account_iam_binding" "github_actions_workload_identity" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "principalSet://iam.googleapis.com/projects/${data.google_project.project.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/attribute.repository/grantflow-ai/monorepo"
  ]
}

# Data source to get the project number
data "google_project" "project" {
  project_id = "grantflow"
}