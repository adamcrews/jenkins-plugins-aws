'use strict';

// Load Required libraries
const AWS   = require('aws-sdk');

// import the config module
const config = require('./config');

// Set the region... is this really needed?
AWS.config.update({ region: config.REGION });

// Create the sqs service opbject
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
var s3  = new AWS.S3();

function deleteMessage(receiptHandle, cb) {
  sqs.deleteMessage({
    ReceiptHandle: receiptHandle,
    QueueUrl: config.SQS_QUEUE
  }, cb);
}

function work(task, cb) {
  let message = JSON.parse(task);
  console.log(message);

  let pName = message.name;
  console.log(pName);

  // let params = {
  //  Bucket: config.S3_BUCKET,
  //  Key: '/rpm/' + pName + '.rpm'
  // };

  //s3.headObject(params, function (err, metadata) {
  //  if (err && err.code === 'NotFound') {
    // stuff
  //  console.log('No s3 item');
  //  }
  //});
  cb();
}

exports.handler = function(event, context, callback) {
  work(event.Body, function(err) {
    if (err) {
      callback(err);
    } else {
      //deleteMessage(event.ReceiptHandle, callback);
      console.log(event.ReceiptHandle);
    }
  });
};
