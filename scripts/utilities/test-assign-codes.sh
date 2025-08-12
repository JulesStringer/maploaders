#!/bin/bash
export TARGET_POINTS="/mnt/www/stringerhj.co.uk/mapdata/uprn/uprn_lookup.json"
export POLYGONS="/mnt/www/stringerhj.co.uk/mapdata/boundaries/TeignbridgeParishes.json"
export CODE=CODE
export POINT_CODE=PARISH_CODE
export OUTPUT_FILE="/mnt/www/stringerhj.co.uk/mapdata/uprn/teignbridge_uprn.json"
./assign-codes.sh
