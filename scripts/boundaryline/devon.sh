#!/bin/bash
TARGET="${TARGET_DIR}Devon.json"
rm ${TARGET}
ogr2ogr -f GeoJSON "${TARGET}" ${SOURCE} \
        -where "CODE IN ('E10000008')"
