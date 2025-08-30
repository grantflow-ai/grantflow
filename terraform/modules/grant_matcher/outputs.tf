output "grant_matcher_function_uri" {
  value = google_cloudfunctions2_function.grant_matcher.service_config[0].uri
}