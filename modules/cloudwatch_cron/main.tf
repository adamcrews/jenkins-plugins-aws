resource "aws_cloudwatch_event_rule" "cron" {
  name = "${var.function_name}"

  schedule_expression = "${var.schedule}"
}

resource "aws_cloudwatch_event_target" "target" {
  target_id = "jenkins-plugins-${var.function_name}"
  rule      = "${aws_cloudwatch_event_rule.cron.name}"
  arn       = "${var.lambda}"
}

resource "aws_lambda_permission" "lambda" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = "${var.function_name}"
  principal     = "events.amazonaws.com"
  source_arn    = "${aws_cloudwatch_event_rule.cron.arn}"
}
