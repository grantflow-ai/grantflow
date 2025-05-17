resource "google_storage_bucket" "uploads" {
  name                        = "grantflow-uploads"
  location                    = "US"
  force_destroy               = false
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  soft_delete_policy {
    retention_duration_seconds = 604800
  }
}

# IAM for the storage bucket
resource "google_storage_bucket_iam_policy" "uploads" {
  bucket      = google_storage_bucket.uploads.name
  policy_data = <<POLICY
{
  "bindings": [
    {
      "members": [
        "projectEditor:grantflow",
        "projectOwner:grantflow"
      ],
      "role": "roles/storage.legacyBucketOwner"
    },
    {
      "members": [
        "projectViewer:grantflow"
      ],
      "role": "roles/storage.legacyBucketReader"
    },
    {
      "members": [
        "projectEditor:grantflow",
        "projectOwner:grantflow"
      ],
      "role": "roles/storage.legacyObjectOwner"
    },
    {
      "members": [
        "projectViewer:grantflow"
      ],
      "role": "roles/storage.legacyObjectReader"
    }
  ]
}
POLICY
}
