#!/bin/bash
PROCESSED_DIR=/mnt/www/stringerhj.co.uk/mapdata/
ZIPBASE=/mnt/audio5/raw_maps/osopendata/
NODE=/home/jules/.nvm/versions/node/v24.0.1/bin/node
SCRIPTS=/home/jules/Projects/maploaders/scripts/
${NODE} ${SCRIPTS}update_opendata.js processed=${PROCESSED_DIR} zips=${ZIPBASE}