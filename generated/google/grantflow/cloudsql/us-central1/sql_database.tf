resource "google_sql_database" "tfer--grantflow-postgres" {
  charset         = "UTF8"
  collation       = "en_US.UTF8"
  deletion_policy = "DELETE"
  instance        = "grantflow"
  name            = "postgres"
  project         = "grantflow"
}
