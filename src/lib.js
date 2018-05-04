'use strict';

const config = require('./config');

const AWS = require('aws-sdk');
const fs = require('fs-extra');
const path = require('path');

module.exports.uploadFile = function uploadFile(fileName, data) {
  return new Promise(function(resolve, reject) {
    var s3 = new AWS.S3();

    s3.putObject({
      Bucket: config.S3_BUCKET,
      Key: fileName,
      Body: data,
      ContentType: 'application/octet-stream',
      ACL: 'public-read'
    }, function(resp) {
      console.log('Successfully uploaded package: ' + fileName);
      resolve('Successfully uploaded package: ' + fileName);
    });
  });
};

module.exports.checkFile = function findFile(fileName) {
  return new Promise(function(resolve, reject) {
    var s3 = new AWS.S3();
    let params = {
      Bucket: config.S3_BUCKET,
      Key: fileName
    };

    s3.headObject(params, function(err, metadata) {
      if (err && err.code === 'NotFound') {
        reject("NotFound");
      } else {
        console.error(err);
        reject(err);
      }
      resolve("Found");
    });
  });
};

module.exports.basename = function basename(str, sep) {
  return str.substr(str.lastIndexOf(sep) + 1);
};

module.exports.strip_extension = function strip_extension(str) {
  return str.substr(0, str.lastIndexOf('.'));
};

module.exports.mkDirByPathSync = function mkDirByPathSync(targetDir, {
  isRelativeToScript = false
} = {}) {
  const sep = path.sep;
  const initDir = path.isAbsolute(targetDir) ? sep : '';
  const baseDir = isRelativeToScript ? __dirname : '.';

  targetDir.split(sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(baseDir, parentDir, childDir);
    try {
      fs.mkdirSync(curDir);
      //console.info(`Directory ${curDir} created!`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }
      //console.log(`Directory ${curDir} already exists!`);
    }

    return curDir;
  }, initDir);
};