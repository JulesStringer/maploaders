#!/bin/bash
TARGET="${TARGET_DIR}DevonConstituencies.json"
rm ${TARGET}
ogr2ogr -f GeoJSON "${TARGET}" ${SOURCE} \
        -where "CODE IN('E14001381','E14001155')"

