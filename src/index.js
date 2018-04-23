"use strict";

const AWS = require("aws-sdk");

// Set the region... is this really needed?
AWS.config.update({ region: process.env.region });

// Is the version needed?
var sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
