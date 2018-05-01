"use strict";

// Load Required libraries
const AWS = require("aws-sdk");
const https = require("https");
const config = require("./config");

// Set the region... is this really needed?
AWS.config.update({
  region: config.REGION
});

// Create the sqs service opbject
var sqs = new AWS.SQS({
  apiVersion: "2012-11-05"
});
var sns = new AWS.SNS();

//module.exports.get_plugins = (event, context, callback) => {
exports.handler = (event, context) => {
  // Get our json file
  https.get(config.PLUGIN_URL, res => {
    let body = "";
    let plugins = "";

    res.setEncoding("utf8");
    res.on("data", data => {
      body += data;
    });

    res.on("end", () => {
      body = JSON.parse(body);
      plugins = Object.keys(body["plugins"]);
      plugins.forEach(plugin => {
        var sqsParams = {
          MessageAttributes: {
            plugin: {
              DataType: "String",
              StringValue: plugin
            }
          },
          MessageBody: JSON.stringify(body["plugins"][plugin]),
          QueueUrl: config.SQS_QUEUE
        };

        sqs.sendMessage(sqsParams, function(err, data) {
          if (err) {
            console.log("Error: ", err);
          }
        });
      });
    });
  });

  var params = {
    TargetArn: config.SNS_TOPIC,
    Message: 'Do the things!!!',
    Subject: 'Trigger Lambda'
  };

  sns.publish(params, function(err, data) {
    if (err) {
      console.log('Error sending message', err);
      //} else {
      //  console.log('Sent message:', data.MessageId);
    }
  });
};