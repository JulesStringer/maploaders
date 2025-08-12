#!/bin/bash
echo "Target: ${TARGET}"
echo "Source: ${SOURCE}"
echo "Clipsrc: ${CLIPSRC}"
echo "Timestamp: $(date +%Y-%m-%d\ %H:%M:%S)"
# get bounding box
BBOX=$(ogrinfo -ro -al -so -geom=NO "${CLIPSRC}" | grep "Extent" | sed -E 's/[^0-9.]+/ /g' | xargs)
echo "Bounding box: ${BBOX}"
echo "Timestamp: $(date +%Y-%m-%d\ %H:%M:%S)"
# extract features within bounding box
set -x
ogr2ogr -f CSV temp.csv -spat ${BBOX} -oo X_POSSIBLE_NAMES=X_COORDINATE -oo Y_POSSIBLE_NAMES=Y_COORDINATE \
-select "UPRN" \
-lco GEOMETRY=AS_XY \
"${SOURCE}"
set +x
echo "Extracted intermediate file temp.csv"
echo "Timestamp: $(date +%Y-%m-%d\ %H:%M:%S)"
# do final extract
set -x
ogr2ogr -f CSV "${TARGET}" -oo X_POSSIBLE_NAMES=X -oo Y_POSSIBLE_NAMES=Y temp.csv -clipsrc "${CLIPSRC}" 
set +x
echo "Timestamp: $(date +%Y-%m-%d\ %H:%M:%S)"
rm temp.csv
set -x
export TARGET_POINTS="${TARGET_DIR}uprn_lookup.json"
NODE=/home/jules/.nvm/versions/node/v24.0.1/bin/node
${NODE} ./csv2json_uprn.js "${TARGET}" "${TARGET_POINTS}"
echo "Timestamp: $(date +%Y-%m-%d\ %H:%M:%S)"
set +x
export POLYGONS="${MAPDATA_DIR}boundaries/TeignbridgeParishes.json"
export CODE=CODE
export POINT_CODE=PARISH_CODE
export OUTPUT_FILE="${TARGET_POINTS}"
../utilities/assign-codes.sh
echo "Timestamp: $(date +%Y-%m-%d\ %H:%M:%S)"
export POLYGONS="${MAPDATA_DIR}boundaries/TeignbridgeWards.json"
export POINT_CODE=WARD_CODE
../utilities/assign-codes.sh
echo "Timestamp: $(date +%Y-%m-%d\ %H:%M:%S)"

