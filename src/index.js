'use strict';

const AWS = require('aws-sdk');

// Set the region... is this really needed?
AWS.config.update({region: process.env.region});

// Read the queue and s3 info from the env.  These are set as env variables
// on the lambdas by the terraform script that creates everything in aws.
var sqsQueue = process.env.sqsQueue;
var s3Bucket = process.env.s3Bucket;
var release  = process.env.release;

// Is the version needed?
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
