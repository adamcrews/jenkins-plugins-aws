'use strict';

// Load Required libraries
const https = require('https');
const AWS   = require('aws-sdk');
// import the config module
const config = require('./config');

// Set the region... is this really needed?
AWS.config.update({region: process.env.region});

// Create the sqs service opbject
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
var s3  = new AWS.S3();

function deleteMessage(receiptHandle, cb) {
  sqs.deleteMessage({
    ReceiptHandle: receiptHandle,
    // reference the SQS_QUEUE param on the imported config object
    QueueUrl: config.SQS_QUEUE
  }, cb);
}

function work(task, cb) {
  var message = JSON.parse(task);
  //console.log(task);
  pName = message.name;
  console.log(pName);

  let params = {
    Bucket: config.S3_BUCKET,
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
