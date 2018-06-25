#!/bin/bash
set -e

# rm -rf package-lock.json node_modules
# npm install

# rm -r node_modules/arlas-api/*
# cp -r ../arlas-api/* node_modules/arlas-api/
npm run build-release
