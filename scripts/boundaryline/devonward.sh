#!/bin/bash
TARGET="${TARGET_DIR}DevonWards.json"
rm ${TARGET}
ogr2ogr -f GeoJSON "${TARGET}" ${SOURCE} \
        -where "FILE_NAME='DEVON_COUNTY'"
