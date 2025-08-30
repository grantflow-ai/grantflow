# Budget variables
variable "enable_billing_budget" {
  description = "Whether to create billing budget alerts"
  type        = bool
  default     = false
}

variable "monthly_budget_amount" {
  description = "Monthly budget amount in USD"
  type        = string
  default     = "500"
}

# Main variables
variable "project_id" {
  description = "The project ID to deploy monitoring resources to"
  type        = string
}

variable "discord_webhook_url" {
  description = "Discord webhook URL for alert notifications"
  type        = string
}

variable "environment" {
  description = "Environment (staging, prod)"
  type        = string
  default     = "staging"
}

variable "discord_role_alerts" {
  description = "Discord role ID for alert mentions"
  type        = string
  default     = ""
}

variable "enable_kms_encryption" {
  description = "Enable KMS encryption for storage buckets (recommended for production)"
  type        = bool
  default     = false
}

variable "enable_uptime_checks" {
  description = "Enable external uptime monitoring"
  type        = bool
  default     = false
}

variable "enable_error_reporting" {
  description = "Enable enhanced error tracking"
  type        = bool
  default     = false
}

variable "alert_thresholds" {
  description = "Alert threshold configuration"
  type = object({
    error_rate_threshold = number
    latency_threshold    = number
    memory_threshold     = number
    cpu_threshold        = number
  })
  default = {
    error_rate_threshold = 0.05
    latency_threshold    = 5000
    memory_threshold     = 0.90
    cpu_threshold        = 0.85
  }
}

# PubSub Logging
variable "notification_channels" {
  description = "List of notification channel IDs for alerts"
  type        = list(string)
  default     = []
}

