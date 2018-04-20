'use strict';

// Load Required libraries
const AWS = require('aws-sdk');
const https = require('https');

// Set the region... is this really needed?
AWS.config.update({region: process.env.region});

// Create the sqs service opbject
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

// Read the queue url from the env
var sqsQueue = process.env.sqsQueue

//module.exports.get_plugins = (event, context, callback) => {
module.exports.get_plugins = (event, context) => {
  // Get our json file
  const url = 'https://updates.jenkins-ci.org/current/update-center.actual.json';
  
  https.get(url, res => {
    let body = "";
    let plugins = "";

    res.setEncoding("utf8");
    res.on("data", data => {
      body += data;
    });

    res.on("end", () => {
      body = JSON.parse(body);
      plugins = Object.keys(body['plugins']);
      plugins.forEach((plugin) => {
        var sqsParams = {
          MessageBody: JSON.stringify(body['plugins'][plugin]),
          QueueUrl: sqsQueue
        }
            
        sqs.sendMessage(sqsParams, function(err, data) {
          if (err) {
            console.log('Error: ', err);
          }
          // console.log(data);
        });
      });
    });
  });
};
