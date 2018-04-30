output "sqsQueue" {
  value = "${aws_sqs_queue.jenkins-plugins.id}"
}
