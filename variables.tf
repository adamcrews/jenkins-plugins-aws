# What are our variables
variable "runinterval" {
  description = "How often (in minutes) should we check and process new plugins."
  default     = "90"
}

variable "pkg_release" {
  description = "The release/build number of the packages."
  default     = "1"
}

variable "region" {
  description = "The AWS Region to create resources in."
  default     = "us-west-2"
}

variable "domain" {
  description = "The dns domain name to use."
  default     = "pdxlab.tech"
}

data "external" "userid_local" {
  program = ["${path.module}/resources/whoami.sh"]
}

variable "userid" {
  description = "The userid to use for tagging."
  default     = "default"
}

variable "app_environment" {
  description = "The application environment/tier."
  default     = "prod"
}
