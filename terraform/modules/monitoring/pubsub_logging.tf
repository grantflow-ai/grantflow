resource "google_logging_metric" "pubsub_publish_success" {
  name   = "pubsub-publish-success"
  filter = <<-EOT
    resource.type="pubsub_topic"
    protoPayload.methodName="google.pubsub.v1.Publisher.Publish"
    severity!="ERROR"
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key         = "topic"
      value_type  = "STRING"
      description = "The Pub/Sub topic name"
    }
    labels {
      key         = "project_id"
      value_type  = "STRING"
      description = "The project ID"
    }
    display_name = "Pub/Sub Publish Success Count"
  }

  label_extractors = {
    "topic"      = "EXTRACT(resource.labels.topic_id)"
    "project_id" = "EXTRACT(resource.labels.project_id)"
  }
}

resource "google_logging_metric" "pubsub_publish_error" {
  name   = "pubsub-publish-error"
  filter = <<-EOT
    resource.type="pubsub_topic"
    protoPayload.methodName="google.pubsub.v1.Publisher.Publish"
    severity="ERROR"
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key         = "topic"
      value_type  = "STRING"
      description = "The Pub/Sub topic name"
    }
    labels {
      key         = "error_code"
      value_type  = "STRING"
      description = "The error code"
    }
    display_name = "Pub/Sub Publish Error Count"
  }

  label_extractors = {
    "topic"      = "EXTRACT(resource.labels.topic_id)"
    "error_code" = "EXTRACT(protoPayload.status.code)"
  }
}

resource "google_logging_metric" "pubsub_subscription_pull" {
  name   = "pubsub-subscription-pull"
  filter = <<-EOT
    resource.type="pubsub_subscription"
    protoPayload.methodName=~"google.pubsub.v1.Subscriber.(Pull|StreamingPull)"
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key         = "subscription"
      value_type  = "STRING"
      description = "The subscription name"
    }
    labels {
      key         = "method"
      value_type  = "STRING"
      description = "Pull or StreamingPull"
    }
    display_name = "Pub/Sub Subscription Pull Count"
  }

  label_extractors = {
    "subscription" = "EXTRACT(resource.labels.subscription_id)"
    "method"       = "EXTRACT(protoPayload.methodName)"
  }
}

resource "google_logging_metric" "pubsub_ack_latency" {
  name   = "pubsub-ack-latency"
  filter = <<-EOT
    resource.type="pubsub_subscription"
    protoPayload.methodName="google.pubsub.v1.Subscriber.Acknowledge"
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key         = "subscription"
      value_type  = "STRING"
      description = "The subscription name"
    }
    display_name = "Pub/Sub Message Acknowledgment Count"
  }

  label_extractors = {
    "subscription" = "EXTRACT(resource.labels.subscription_id)"
  }
}

resource "google_logging_metric" "pubsub_dlq_messages" {
  name   = "pubsub-dlq-messages"
  filter = <<-EOT
    resource.type="pubsub_subscription"
    jsonPayload.message="Message moved to dead letter queue"
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key         = "subscription"
      value_type  = "STRING"
      description = "The subscription name"
    }
    labels {
      key         = "dlq_topic"
      value_type  = "STRING"
      description = "The dead letter queue topic"
    }
    display_name = "Messages Sent to Dead Letter Queue"
  }

  label_extractors = {
    "subscription" = "EXTRACT(resource.labels.subscription_id)"
    "dlq_topic"    = "EXTRACT(jsonPayload.dlq_topic)"
  }
}

resource "google_logging_metric" "websocket_notification_sent" {
  name   = "websocket-notification-sent"
  filter = <<-EOT
    jsonPayload.message="Published source processing message"
    OR jsonPayload.message="Published notification"
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key         = "event"
      value_type  = "STRING"
      description = "The notification event type"
    }
    labels {
      key         = "parent_id"
      value_type  = "STRING"
      description = "The parent ID (application ID)"
    }
    display_name = "WebSocket Notifications Sent"
  }

  label_extractors = {
    "event"     = "EXTRACT(jsonPayload.notification_event)"
    "parent_id" = "EXTRACT(jsonPayload.parent_id)"
  }
}

resource "google_logging_metric" "websocket_notification_received" {
  name   = "websocket-notification-received"
  filter = <<-EOT
    jsonPayload.message="received message from pubsub"
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key         = "subscription"
      value_type  = "STRING"
      description = "The subscription path"
    }
    display_name = "WebSocket Notifications Received"
  }

  label_extractors = {
    "subscription" = "EXTRACT(jsonPayload.subscription_path)"
  }
}



resource "google_monitoring_dashboard" "pubsub_dashboard" {
  dashboard_json = jsonencode({
    displayName = "Pub/Sub Monitoring Dashboard"
    gridLayout = {
      widgets = [
        {
          title = "Publish Success Rate"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"logging.googleapis.com/user/pubsub-publish-success\" resource.type=\"global\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        },
        {
          title = "Publish Error Rate"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"logging.googleapis.com/user/pubsub-publish-error\" resource.type=\"global\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        },
        {
          title = "WebSocket Notifications Flow"
          xyChart = {
            dataSets = [
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"logging.googleapis.com/user/websocket-notification-sent\" resource.type=\"global\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_RATE"
                    }
                  }
                }
                legendTemplate = "Sent"
              },
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"logging.googleapis.com/user/websocket-notification-received\" resource.type=\"global\""
                    aggregation = {
                      alignmentPeriod  = "60s"
                      perSeriesAligner = "ALIGN_RATE"
                    }
                  }
                }
                legendTemplate = "Received"
              }
            ]
          }
        },
        {
          title = "Dead Letter Queue Messages"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"logging.googleapis.com/user/pubsub-dlq-messages\" resource.type=\"global\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_RATE"
                    groupByFields    = ["metric.label.subscription"]
                  }
                }
              }
            }]
          }
        },
        {
          title = "Subscription Pull Latency"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"pubsub.googleapis.com/subscription/pull_request_count\" resource.type=\"pubsub_subscription\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        },
        {
          title = "Unacked Messages by Subscription"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"pubsub.googleapis.com/subscription/num_undelivered_messages\" resource.type=\"pubsub_subscription\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_MEAN"
                    groupByFields    = ["resource.label.subscription_id"]
                  }
                }
              }
            }]
          }
        }
      ]
    }
  })
}

variable "notification_channels" {
  description = "List of notification channel IDs for alerts"
  type        = list(string)
  default     = []
}