# Consistently create our lambda functions

locals {
  function_name = "jenkins-plugins-${replace(var.handler,".","-")}"
}

resource "aws_lambda_function" "lambda" {
  function_name    = "${local.function_name}"
  handler          = "${var.handler}"
  filename         = "${var.filename}"
  source_code_hash = "${var.filename_sha}"
  runtime          = "${var.runtime}"
  timeout          = "${var.timeout}"
  role             = "${var.role_arn}"

  environment {
    variables = {
      sqsQueue = "${var.sqs_queue}"
      release  = "${var.pkg_release}"
      s3Bucket = "${var.s3_bucket}"
      snsTopic = "${var.sns_topic}"
    }
  }

  tags {
    Terraform   = "true"
    Environment = "${var.app_environment}"
    Owner       = "${var.userid}"
    Project     = "jenkins-plugins"
  }
}

# Collect lambda logs
resource "aws_cloudwatch_log_group" "jenkins-plugins" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = "1"

  tags {
    Terraforn   = "true"
    Environment = "${var.app_environment}"
    Project     = "jenkins-plugins"
    Owner       = "${var.userid}"
  }
}

resource "aws_iam_role_policy" "lambda-policy" {
  name = "${local.function_name}-${var.app_environment}"
  role = "${var.role_id}"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "${aws_lambda_function.lambda.arn}"
    }
  ]
}
EOF
}