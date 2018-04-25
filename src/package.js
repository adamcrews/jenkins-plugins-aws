'use strict';

// Load Required libraries
const AWS   = require('aws-sdk');
const fs    = require('fs');
const path  = require('path');
const { exec }  = require('child_process');

// import the config module
const config = require('./config');

// Set the region... is this really needed?
AWS.config.update({ region: process.env.AWS_REGION });

// Create the sqs service opbject
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
var s3  = new AWS.S3();

function deleteMessage(receiptHandle, cb) {
  sqs.deleteMessage({
    ReceiptHandle: receiptHandle,
    QueueUrl: config.SQS_QUEUE
  }, cb);
}

function basename(str, sep) {
  return str.substr(str.lastIndexOf(sep) + 1);
}

function strip_extension(str) {
  return str.substr(0,str.lastIndexOf('.'));
}

function mkDirByPathSync(targetDir, {isRelativeToScript = false} = {}) {
  const sep     = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  const baseDir = isRelativeToScript ? __dirname : '.';

  targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
      console.log(`Directory ${curDir} created!`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
      //console.log(`Directory ${curDir} already exists!`);
    }

    return curDir;
  }, initDir);
}

function work(task, cb) {
  const mustache = require('mustache');
  const buildRoot  = '/tmp/rpmbuild';

  var message = JSON.parse(task);
  let templ   = fs.readFileSync(process.cwd() + '/rpm_spec.mustache', 'utf8');

  message.release          = config.RELEASE;
  message.version_underbar = message.version.replace(/-/g,"_");
  message.filename         = strip_extension(basename(message.url,'/'));

  let buildDirs = [ 'BUILD', 'BUILDROOT', 'RPMS', 'SPECS', 'SRPMS', 'SOURCES', 'tmp' ];
  for (var d in buildDirs) {
    mkDirByPathSync(buildRoot + '/' + buildDirs[d]);
  }

  let specFile = buildRoot + '/SPECS/jenkins-plugin-' + message.name + '.spec';
  fs.writeFile(
    specFile,
    mustache.render(templ, message),
    function (err) {
      if(err) throw err;
  });

  let buildCmd = process.cwd() + '/rpmbuild --define \'_tmppath ' + buildRoot + '/tmp\' --define \'_topdir ' + buildRoot + '\' --buildroot ' + buildRoot + ' -ba ' + specFile;
  exec(buildCmd, (err, stdout, stderr) => {
    if (err) {
      // node couldn't execute the command
      console.log(err);
      return;
    }

    // the *entire* stdout and stderr (buffered)
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  });

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
