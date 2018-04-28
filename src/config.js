// define and export all your common constants here
module.exports = {
  REGION: process.env.AWS_REGION,
  SQS_QUEUE: process.env.sqsQueue,
  SNS_TOPIC: process.env.snsTopic,
  S3_BUCKET: process.env.s3Bucket,
  RELEASE: process.env.release,
  PLUGIN_URL: "https://updates.jenkins-ci.org/current/update-center.actual.json",
  RPMROOT: "/tmp/rpmbuild"
};
