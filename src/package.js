'use strict';

// Load Required libraries
const AWS   = require('aws-sdk');
const fs    = require('fs-extra');
const path  = require('path');
const { exec }  = require('child_process');

// import the config module
const config = require('./config');

AWS.config.update({ region: config.AWS_REGION });

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

function uploadFile(bucket, fileName, data) {
  let params = {
    Bucket: bucket,
    Key: fileName,
    Body: data
  };

  s3.upload(params, function(err, data) {
    if (err) {
      console.log(err);
      throw err;
    }
  });
}

function checkFile(bucket, filename) {
  return new Promise(function(resolve, reject) {
    let params = {
      Bucket: bucket,
      Key: filename
    };

    s3.headObject(params, function (err, metadata) {
      if (err && err.code === 'NotFound') {
        reject("NotFound");
      }
      resolve("Found");
    });
  });
}

function mkDirByPathSync(targetDir, {isRelativeToScript = false} = {}) {
  const sep     = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  const baseDir = isRelativeToScript ? __dirname : '.';

  targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
      //console.log(`Directory ${curDir} created!`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
      //console.log(`Directory ${curDir} already exists!`);
    }

    return curDir;
  }, initDir);
}

function makeBuildDirs(root, subDirs) {
  return new Promise(resolve => {
    // make sure we have a clean tmp area for the packages.  We might get the
    // same container as the previous invocation, and don't want leftovers from a
    // previous build.
    fs.removeSync(root);
    for (var d in subDirs) {
      mkDirByPathSync(root + '/' + subDirs[d]);
    }
  });
}

function buildRpm(cmd, rpmName, srcrpmName) {
  return new Promise(function(resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        reject(err);
      }

      let data = {
        rpm:  fs.readFileSync(config.RPMROOT + '/RPMS/noarch/' + rpmName, 'utf8'),
        srpm: fs.readFileSync(config.RPMROOT + '/SRPMS/' + srcrpmName, 'utf8')
      };

      resolve(data);
    });
  });
}

function work(task, cb) {
  var message = JSON.parse(task);
  message.release          = config.RELEASE;
  message.version_underbar = message.version.replace(/-/g,"_");
  message.filename         = strip_extension(basename(message.url,'/'));

  let rpmName = 'jenkins-plugin-' + message.name + '-' + message.version_underbar + '-' + message.release + '.noarch.rpm';
  let srcrpmName = 'jenkins-plugin-' + message.name + '-' + message.version_underbar + '-' + message.release + '.src.rpm';

  // if a file exists, we just bail
  checkFile(config.S3_BUCKET, 'rpms/' + rpmName)
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
  buildRpm(buildCmd, rpmName, srcrpmName).then(function (data) {
    console.log(config.S3_BUCKET, 'rpms/'+ rpmName);
    uploadFile(config.S3_BUCKET, 'rpms/'+ rpmName, data.rpm);
    uploadFile(config.S3_BUCKET, 'src/' + srcrpmName, data.srpm);
  });

  cb();
}

exports.handler = function(event, context, callback) {
  work(event.Body, function(err) {
    if (err) {
      callback(err);
    } else {
      deleteMessage(event.ReceiptHandle, callback);
      //console.log(event.ReceiptHandle);
    }
  });
};
