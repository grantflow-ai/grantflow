terraform {
  backend "gcs" {
    bucket = "grantflow-terraform-state"
    prefix = "staging"
  }
}
