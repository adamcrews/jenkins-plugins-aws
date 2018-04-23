'use strict';

// Load Required libraries
const https = require('https');
const AWS   = require('aws-sdk');

// Set the region... is this really needed?
AWS.config.update({region: process.env.region});

// Create the sqs service opbject
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
var s3  = new AWS.S3();

// Read the queue and s3 info from the env
var sqsQueue = process.env.sqsQueue;
var s3Bucket = process.env.s3Bucket;
var release  = process.env.release;

function deleteMessage(receiptHandle, cb) {
  sqs.deleteMessage({
    ReceiptHandle: receiptHandle,
    QueueUrl: sqsQueue
  }, cb);
}

function work(task, cb) {
  var message = JSON.parse(task);
  //console.log(task);
  pName = message.name;
  console.log(pName);

  let params = {
    Bucket: s3Bucket,
    Key: '/rpm/' + pName + '.rpm'
  };

  s3.headObject(params, function (err, metadata) {
    if (err && err.code === 'NotFound') {
    // stuff
    }
  });
  cb();
}

exports.build_rpm = function(event, context, callback) {
  work(event.Body, function(err) {
    if (err);
      callback(err);
    } else {
      deleteMessage(event.ReceiptHandle, callback);
    }
  });
};
