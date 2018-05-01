variable "function_name" {
  description = "The name of the lambda that is called by this rule."
}

variable "lambda" {
  description = "The arn of the lambda to execute."
}

variable "schedule" {
  description = "How often to trigger this event."
  default     = "rate(180 minutes)"
}
