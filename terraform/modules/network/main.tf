resource "google_compute_network" "default" {
  auto_create_subnetworks                   = true
  delete_default_routes_on_create           = false
  description                               = "Default network for the project"
  name                                      = "default"
  network_firewall_policy_enforcement_order = "AFTER_CLASSIC_FIREWALL"
  routing_mode                              = "REGIONAL"
}

resource "google_compute_subnetwork" "default" {
  name          = "default"
  ip_cidr_range = "10.128.0.0/20"
  network       = google_compute_network.default.id
  region        = "us-central1"
}
