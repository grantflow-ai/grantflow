data "external_schema" "sqlalchemy" {
  program = [
    "atlas-provider-sqlalchemy",
    "--path", "./src/db",
    "--dialect", "postgresql"
  ]
}

env "sqlalchemy" {
  src = data.external_schema.sqlalchemy.url
  url = "postgresql://grantflow:grantflow@localhost:5432/grantflow?search_path=public&sslmode=disable"
  dev = "postgresql://grantflow:grantflow@localhost:5432/grantflow?search_path=public&sslmode=disable"
  migration {
    dir = "file://migrations"
  }
  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}
