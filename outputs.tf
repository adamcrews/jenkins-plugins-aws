output "sqsQueue" {
  value = "${aws_sqs_queue.jenkins_plugins.id}"
}
