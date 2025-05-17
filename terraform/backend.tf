terraform {
  backend "gcs" {
    bucket = "grantflow-terraform-state"
    prefix = "terraform/state"
  }
}
