#!/bin/bash
export SOURCE=/mnt/audio5/raw_maps/osopendata/osopenuprn_202507_csv/osopenuprn_202507.csv
export TARGET=/mnt/www/stringerhj.co.uk/mapdata/uprn/uprn_test.csv
export CLIPSRC=/mnt/www/stringerhj.co.uk/mapdata/boundaries/Teignbridge.json
export TARGET_DIR=/mnt/www/stringerhj.co.uk/mapdata/uprn/
echo "Target: ${TARGET}"
echo "Source: ${SOURCE}"
echo "Clipsrc: ${CLIPSRC}"
echo "Target directory: ${TARGET_DIR}"
./uprn.sh
#~/Projects/maploaders/OpenOSloader/scripts/uprn/uprn.sh
