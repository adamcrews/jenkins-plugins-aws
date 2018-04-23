// define and export all your common constants here
module.exports = {
  SQS_QUEUE: process.env.sqsQueue,
  S3_BUCKET: process.env.s3Bucket,
  RELEASE: process.env.release
};
