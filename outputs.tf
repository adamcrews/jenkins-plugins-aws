# Output some handy info
output "sqsQueue" {
  value = "${aws_sqs_queue.jenkins-plugins.id}"
}

output "bucketname" {
  value = "${module.package_bucket.s3_bucket_id}"
}
