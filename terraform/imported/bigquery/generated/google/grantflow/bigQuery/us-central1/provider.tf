provider "google" {
  project = "grantflow"
}

terraform {
	required_providers {
		google = {
	    version = ""
		}
  }
}
