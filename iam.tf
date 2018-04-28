# Define our IAM policies here

# This is used by the lambda to allow it to execute
resource "aws_iam_role" "jenkins-plugins-role" {
  name = "jenkins-plugins-role"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

# This is added to the lambda role to allow access to post sqs messages
resource "aws_iam_role_policy" "jenkins-plugins-sqs-policy" {
  name = "jenkins-plugins-sqs-policy"
  role = "${aws_iam_role.jenkins-plugins-role.id}"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:SendMessage*",
        "sqs:ReceiveMessage",
        "sqs:ChangeMessageVisibility",
        "sqs:DeleteMessage"
      ],
      "Resource": [
        "${aws_sqs_queue.jenkins-plugins.arn}"
      ]
    }
  ]
}
EOF
}

# This is added to the lambda role to allow access to post sqs messages
resource "aws_iam_role_policy" "jenkins-plugins-lambda-policy" {
  name = "jenkins-plugins-lambda-policy"
  role = "${aws_iam_role.jenkins-plugins-role.id}"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "${aws_lambda_function.jenkins-plugins-get-plugins.arn}",
        "${aws_lambda_function.jenkins-plugins-create-packages.arn}",
        "${aws_lambda_function.jenkins-plugins-dispatcher.arn}"
      ]
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "jenkins-plugins-sns-policy" {
  name = "jenkins-plugins-sns-policy"
  role = "${aws_iam_role.jenkins-plugins-role.id}"

  policy = <<EOP
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "SNS:Publish"
      ],
      "Resource": [
        "${aws_sns_topic.topic.arn}"
      ]
    }
  ]
}
EOP
}
