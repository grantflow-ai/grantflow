resource "google_firestore_index" "grants_category_amount_min" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "grants"

  fields {
    field_path = "category"
    order      = "ASCENDING"
  }

  fields {
    field_path = "amount_min"
    order      = "ASCENDING"
  }

  fields {
    field_path = "created_at"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "grants_category_amount_max" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "grants"

  fields {
    field_path = "category"
    order      = "ASCENDING"
  }

  fields {
    field_path = "amount_max"
    order      = "ASCENDING"
  }

  fields {
    field_path = "created_at"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "grants_deadline" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "grants"

  fields {
    field_path = "deadline"
    order      = "ASCENDING"
  }

  fields {
    field_path = "created_at"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "grants_amount_range" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "grants"

  fields {
    field_path = "amount_min"
    order      = "ASCENDING"
  }

  fields {
    field_path = "amount_max"
    order      = "ASCENDING"
  }

  fields {
    field_path = "created_at"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "grants_deadline_range" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "grants"

  fields {
    field_path = "deadline"
    order      = "ASCENDING"
  }

  fields {
    field_path = "deadline"
    order      = "DESCENDING"
  }

  fields {
    field_path = "created_at"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "subscriptions_email" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "subscriptions"

  fields {
    field_path = "email"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "subscriptions_verification_token" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "subscriptions"

  fields {
    field_path = "verification_token"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "subscriptions_verified" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "subscriptions"

  fields {
    field_path = "verified"
    order      = "ASCENDING"
  }

  fields {
    field_path = "frequency"
    order      = "ASCENDING"
  }

  fields {
    field_path = "created_at"
    order      = "DESCENDING"
  }
}