data "external_schema" "sqlalchemy" {
  program = [
    "atlas-provider-sqlalchemy",
    "--path", "./src/db",
    "--dialect", "postgresql"
  ]
}

data "composite_schema" "app" {
  schema {
    url = "file://schema.sql"
  }
  schema "public" {
    url = data.external_schema.sqlalchemy.url
  }
}

env "sqlalchemy" {
  url = "postgresql://grantflow:grantflow@0.0.0.0:5432/grantflow?search_path=public&sslmode=disable"
  dev = "docker://pgvector/pg17/dev"
  src = data.composite_schema.app.url

  migration {
    dir = "file://migrations"
  }
  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}
