'use strict';

// Load Required libraries
const AWS       = require('aws-sdk');
const fs        = require('fs-extra');
const path      = require('path');
const { exec }  = require('child_process');

// import this module's configuration
const config = require('./config');
const util   = require('./lib');

AWS.config.update({ region: config.AWS_REGION });

// Create the sqs service opbject
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
var s3  = new AWS.S3();

const rpmPath = 'rpms/Packages/';
const srpmPath = 'source/srpms/';

function deleteMessage(receiptHandle, cb) {
  sqs.deleteMessage({
    ReceiptHandle: receiptHandle,
    QueueUrl: config.SQS_QUEUE
  }, cb);
}

function makeBuildDirs(root, subDirs) {
  return new Promise(resolve => {
    // make sure we have a clean tmp area for the packages.  We might get the
    // same container as the previous invocation, and don't want leftovers from a
    // previous build.
    fs.removeSync(root);
    for (var d in subDirs) {
      util.mkDirByPathSync(root + '/' + subDirs[d]);
    }
  });
}

function buildRpm(cmd, rpmName, srpmName) {
  return new Promise(function(resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        reject(err);
      }

      let data = {
        rpm:  fs.readFileSync(config.RPMROOT + '/RPMS/noarch/' + rpmName, 'utf8'),
        srpm: fs.readFileSync(config.RPMROOT + '/SRPMS/' + srpmName, 'utf8')
      };

      resolve(data);
    });
  });
}

function work(task, cb) {
  var message = JSON.parse(task);
  message.release          = config.RELEASE;
  message.version_underbar = message.version.replace(/-/g,"_");
  message.filename         = util.strip_extension(util.basename(message.url,'/'));

  let rpmName = 'jenkins-plugin-' + message.name + '-' + message.version_underbar + '-' + message.release + '.noarch.rpm';
  let srpmName = 'jenkins-plugin-' + message.name + '-' + message.version_underbar + '-' + message.release + '.src.rpm';

  // if a file exists, we just bail
  util.checkFile(rpmPath + rpmName)
    .then(() => {
      console.log('Package already present: Skipping.');
      process.exit();
      })
    .catch(() => {
      return true;
  });

  const mustache = require('mustache');

  let templ   = fs.readFileSync(process.cwd() + '/rpm_spec.mustache', 'utf8');

  let buildDirs = [ 'BUILD', 'BUILDROOT', 'RPMS', 'SPECS', 'SRPMS', 'SOURCES', 'tmp' ];
  makeBuildDirs(config.RPMROOT, buildDirs);

  let specFile = config.RPMROOT + '/SPECS/jenkins-plugin-' + message.name + '.spec';
  fs.writeFile(
    specFile,
    mustache.render(templ, message),
    function (err) {
      if(err) throw err;
  });

  let buildCmd = process.cwd() + '/rpmbuild --define \'_tmppath ' + config.RPMROOT + '/tmp\' --define \'_topdir ' + config.RPMROOT + '\' --buildroot ' + config.RPMROOT + '/BUILDROOT -ba ' + specFile;
  buildRpm(buildCmd, rpmName, srpmName).then(function (data) {
    console.log(rpmPath + rpmName);
    util.uploadFile(rpmPath + rpmName, data.rpm);
    util.uploadFile(srpmPath + srpmName, data.srpm);
  });

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
