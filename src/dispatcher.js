"use strict";

// Load Required libraries
const AWS    = require("aws-sdk");
const async  = require("async");
const config = require("./config");

// Set the region... is this really needed?
AWS.config.update({ region: process.env.AWS_REGION });

// Create the sqs service opbject
var sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
var lambda = new AWS.Lambda();

function receiveMessages(callback) {
  var params = {
    QueueUrl: config.SQS_QUEUE,
    MaxNumberOfMessages: 10
  };
  sqs.receiveMessage(params, function(err, data) {
    if (err) {
      console.error(err, err.stack);
      callback(err);
    } else {
      callback(null, data.Messages);
    }
  });
}

function invokeWorkerLambda(task, callback) {
  var params = {
    FunctionName: "jenkins-plugins-create-packages",
    InvocationType: "Event",
    Payload: JSON.stringify(task)
  };

  lambda.invoke(params, function(err, data) {
    if (err) {
      console.error(err, err.stack);
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

function handleSQSMessages(context, callback) {
  receiveMessages(function(err, messages) {
    if (messages && messages.length > 0) {
      var invocations = [];
      messages.forEach(function(message) {
        invocations.push(function(callback) {
          invokeWorkerLambda(message, callback);
        });
      });

      async.parallel(invocations, function(err) {
        if (err) {
          console.error(err, err.stack);
          callback(err);
        } else {
          if (context.getRemainingTimeInMillis() > 20000) {
            handleSQSMessages(context, callback);
          } else {
            callback(null, "PAUSE");
          }
        }
      });
    } else {
      callback(null, "DONE");
    }
  });
}

exports.handler = function(event, context, callback) {
  handleSQSMessages(context, callback);
};
