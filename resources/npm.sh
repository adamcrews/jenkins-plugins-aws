#!/usr/bin/env bash

SRC_DIR=$1

cd ${SRC_DIR}
rm -rf node_modules
npm install --production

