#!/bin/bash
TARGET="${TARGET_DIR}Teignbridge.json"
rm ${TARGET}
ogr2ogr -f GeoJSON "${TARGET}" ${SOURCE} \
        -where "CODE IN ('E07000045')"
