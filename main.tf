# Create the resources to run all the things

resource "null_resource" "node" {
  triggers {
    config     = "${base64sha256(file("src/config.js"))}"
    dispatcher = "${base64sha256(file("src/dispatcher.js"))}"
    lib        = "${base64sha256(file("src/lib.js"))}"
    package    = "${base64sha256(file("src/package.js"))}"
    plugins    = "${base64sha256(file("src/plugins.js"))}"
  }

  provisioner "local-exec" {
    command = "./resources/npm.sh ${path.module}/src"
  }
}

data "archive_file" "lambda" {
  type        = "zip"
  output_path = "${path.module}/.cache/plugins.zip"
  source_dir  = "${path.module}/src"
  depends_on  = ["null_resource.node"]
}

# Be sure to set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your
# environment.
provider "aws" {
  region = "${var.region}"
}

# SQS queue is used to post messages about what work to do
# visibility_timeout is set to 1 second longer than the max lambda run time
resource "aws_sqs_queue" "jenkins-plugins" {
  name_prefix                = "jenkins-plugins"
  visibility_timeout_seconds = 301

  tags {
    Terraform   = "true"
    Environment = "${var.app_environment}"
    Owner       = "${var.userid}"
    Project     = "jenkins-plugins"
  }
}

# Create the lambdas that do all the work.
module "get-plugins" {
  source = "./modules/lambda"

  filename             = "${data.archive_file.lambda.output_path}"
  filename_sha         = "${data.archive_file.lambda.output_sha}"
  handler              = "plugins.handler"
  role_arn             = "${aws_iam_role.jenkins-plugins-role.arn}"
  role_id              = "${aws_iam_role.jenkins-plugins-role.id}"
  cloudwatch_log_group = "${aws_cloudwatch_log_group.jenkins-plugins.arn}"
  userid               = "${var.userid}"
  sqs_queue            = "${aws_sqs_queue.jenkins-plugins.id}"
  pkg_release          = "${var.pkg_release}"
  s3_bucket            = "${module.package_bucket.s3_bucket_id}"
  sns_topic            = "${aws_sns_topic.topic.arn}"
}

module "create-packages" {
  source = "./modules/lambda"

  filename             = "${data.archive_file.lambda.output_path}"
  filename_sha         = "${data.archive_file.lambda.output_sha}"
  handler              = "package.handler"
  role_arn             = "${aws_iam_role.jenkins-plugins-role.arn}"
  role_id              = "${aws_iam_role.jenkins-plugins-role.id}"
  cloudwatch_log_group = "${aws_cloudwatch_log_group.jenkins-plugins.arn}"
  userid               = "${var.userid}"
  sqs_queue            = "${aws_sqs_queue.jenkins-plugins.id}"
  pkg_release          = "${var.pkg_release}"
  s3_bucket            = "${module.package_bucket.s3_bucket_id}"
}

module "dispatcher" {
  source = "./modules/lambda"

  filename             = "${data.archive_file.lambda.output_path}"
  filename_sha         = "${data.archive_file.lambda.output_sha}"
  handler              = "dispatcher.handler"
  role_arn             = "${aws_iam_role.jenkins-plugins-role.arn}"
  role_id              = "${aws_iam_role.jenkins-plugins-role.id}"
  cloudwatch_log_group = "${aws_cloudwatch_log_group.jenkins-plugins.arn}"
  userid               = "${var.userid}"
  sqs_queue            = "${aws_sqs_queue.jenkins-plugins.id}"
  pkg_release          = "${var.pkg_release}"
  s3_bucket            = "${module.package_bucket.s3_bucket_id}"
}

# Trigger the dispatcher and plugin creator to run on a regular interval.
module "get-plugins-cron" {
  source = "./modules/cloudwatch_cron"

  function_name = "${module.get-plugins.function_name}"
  lambda        = "${module.get-plugins.arn}"
}

module "dispatcher-cron" {
  source = "./modules/cloudwatch_cron"

  function_name = "${module.dispatcher.function_name}"
  lambda        = "${module.dispatcher.arn}"
  schedule      = "rate(10 minutes)"
}

# Create a SNS topic so we can send notifications to the dispatcher that it
# should wake up and uhhh... dispatch.
resource "aws_sns_topic" "topic" {
  name = "jenkins-plugins"
}

resource "aws_sns_topic_subscription" "jenkins-plugins-dispatcher" {
  topic_arn = "${aws_sns_topic.topic.arn}"
  protocol  = "lambda"
  endpoint  = "${module.dispatcher.arn}"
}

resource "aws_lambda_permission" "with_sns" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = "${module.dispatcher.function_name}"
  principal     = "sns.amazonaws.com"
  source_arn    = "${aws_sns_topic.topic.arn}"
}

# We need somewhere to dump all the built stuff to
module "package_bucket" {
  source   = "git@github.com:adamcrews/terraform-aws-s3-bucket.git?ref=feature/flexible_policy"
  s3_fqdn  = "jenkins-plugins-rpm.${var.domain}"
  role_arn = "${aws_iam_role.jenkins-plugins-role.arn}"

  # files          = "${var.files}"
  # base64_files   = "${var.base64_files}"

  allow_public = "true"
  tags = {
    Terraforn   = "true"
    Environment = "${var.app_environment}"
    Project     = "jenkins-plugins"
    Owner       = "${var.userid}"
  }
}

# Collect lambda logs
resource "aws_cloudwatch_log_group" "jenkins-plugins" {
  name_prefix       = "jenkins-plugins"
  retention_in_days = "5"

  tags {
    Terraforn   = "true"
    Environment = "${var.app_environment}"
    Project     = "jenkins-plugins"
    Owner       = "${var.userid}"
  }
}
