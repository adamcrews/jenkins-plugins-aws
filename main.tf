# Create the resources to run all the things

variable "region" {
  description = "The AWS Region to create resources in"
  default = "us-west-2"
}

variable "domain" {
  description = "The dns domain name to use"
  default = "pdxlab.tech"
}

data "archive_file" "plugins" {
  type = "zip"
  output_path = "${path.module}/.cache/plugins.zip"
  source_file = "${path.module}/src/plugins.js"
}

data "archive_file" "package" {
  type = "zip"
  output_path = "${path.module}/.cache/package.zip"
  source_file = "${path.module}/src/package.js"
}

data "archive_file" "dispatcher" {
  type = "zip"
  output_path = "${path.module}/.cache/dispatcher.zip"
  source_file = "${path.module}/src/dispatcher.js"
}

# Be sure to set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your
# environment.
provider "aws" {
  region = "${var.region}"
}

# SQS queue is used to post messages about what work to do
# visibility_timeout is set to 1 second longer than the max lambda run time
resource "aws_sqs_queue" "jenkins_plugins" {
  name_prefix = "jenkins-plugins"
  visibility_timeout_seconds = 301
  tags {
    Owner = "adamc"
    Project = "jenkins_plugins"
  }
}

resource "aws_lambda_function" "jenkins-plugins" {
  filename         = "${data.archive_file.plugins.output_path}"
  function_name    = "jenkins-plugins-get-plugins"
  role             = "${aws_iam_role.jenkins-plugins-role.arn}"
  handler          = "plugins.get_plugins"
  source_code_hash = "${data.archive_file.plugins.output_sha}"
  runtime          = "nodejs8.10"
  timeout          = "300"

  environment {
    variables = {
      sqsQueue = "${aws_sqs_queue.jenkins_plugins.id}"
      region   = "${var.region}"
      release  = "1"
    }
  }
  tags {
    Terraform   = "true"
    Environment = "prod"
    Owner       = "adamc"
    Project     = "jenkins_plugins"
  }
}

resource "aws_lambda_function" "jenkins-plugins-rpm-package" {
  filename         = "${data.archive_file.package.output_path}"
  function_name    = "jenkins-plugins-rpm-package"
  role             = "${aws_iam_role.jenkins-plugins-role.arn}"
  handler          = "package.build_rpm"
  source_code_hash = "${data.archive_file.package.output_sha}"
  runtime          = "nodejs8.10"
  timeout          = "300"

  environment {
    variables = {
      sqsQueue = "${aws_sqs_queue.jenkins_plugins.id}"
      region   = "${var.region}"
      release  = "1"
    }
  }
  tags {
    Terraform   = "true"
    Environment = "prod"
    Owner       = "adamc"
    Project     = "jenkins_plugins"
  }
}

resource "aws_lambda_function" "jenkins-plugins-dispatcher" {
  filename         = "${data.archive_file.dispatcher.output_path}"
  function_name    = "jenkins-plugins-dispatcher"
  role             = "${aws_iam_role.jenkins-plugins-role.arn}"
  handler          = "dispatcher.handler"
  source_code_hash = "${data.archive_file.dispatcher.output_sha}"
  runtime          = "nodejs8.10"
  timeout          = "300"

  environment {
    variables = {
      sqsQueue = "${aws_sqs_queue.jenkins_plugins.id}"
      region   = "${var.region}"
      release  = "1"
    }
  }
  tags {
    Terraform   = "true"
    Environment = "prod"
    Owner       = "adamc"
    Project     = "jenkins_plugins"
  }
}

# Trigger the lambda to run on an interval.
# We need a cloudwatch event rule, an event target, and
# lambda permissions
resource "aws_cloudwatch_event_rule" "jenkins-plugins" {
  name = "jenkins-plugins-feeder"
  depends_on = [
    "aws_lambda_function.jenkins-plugins"
  ]
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "jenkins-plugins" {
  target_id = "jenkins-plugins-get-plugins"
  rule = "${aws_cloudwatch_event_rule.jenkins-plugins.name}"
  arn = "${aws_lambda_function.jenkins-plugins.arn}"
}

resource "aws_lambda_permission" "jenkins-plugins" {
  statement_id = "AllowExecutionFromCloudWatch"
  action = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.jenkins-plugins.function_name}"
  principal = "events.amazonaws.com"
  source_arn = "${aws_cloudwatch_event_rule.jenkins-plugins.arn}"
}

module "rpm_bucket" {
  source         = "git@github.com:adamcrews/terraform-aws-s3-bucket.git?ref=feature/flexible_policy"
  s3_fqdn        = "jenkins-plugins-rpm.${var.domain}"
  role_arn       = "${aws_iam_role.jenkins-plugins-role.arn}"
# files          = "${var.files}"
# base64_files   = "${var.base64_files}"

  allow_public   = "true"

  tags = {
    Terraform   = "true"
    Environment = "prod"
    Project     = "jenkins_plugins"
    Owner       = "adamc"
  }
}
