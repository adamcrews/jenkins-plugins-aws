# Variables to feed to the lambda module

variable "filename" {
  description = "The zipfile of the lambda to upload."
}

variable "filename_sha" {
  default = "The sha hash of the zip used for uploading the lambda."
}

variable "handler" {
  description = "The name of the handler to call in the fuction."
}

variable "runtime" {
  description = "The lambda runtime engine."
  default     = "nodejs8.10"
}

variable "timeout" {
  description = "Max time the lambda can run."
  default     = "300"
}

variable "userid" {
  description = "The userid to use for tagging."
}

variable "role_arn" {
  description = "The IAM role arn to assume for this lambda."
}

variable "role_id" {
  description = "The IAM role id to assume for this lambda."
}

variable "cloudwatch_log_group" {
  description = "The ARN of the cloudwatch group to send messages to."
}

variable "app_environment" {
  description = "The application environment/application tier (dev/test/prod)."
  default     = "prod"
}

variable "sqs_queue" {
  description = "The sqs queue to pull messages from."
  default     = "none"
}

variable "pkg_release" {
  description = "The package release version"
  default     = "1"
}

variable "s3_bucket" {
  default = "The bucket to dump things to"
  default = "none"
}

variable "sns_topic" {
  default = "The bucket to dump things to"
  default = "none"
}
