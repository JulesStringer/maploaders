#!/bin/bash
TARGET="${TARGET_DIR}building.json"
rm "${TARGET}"
ogr2ogr -f GeoJSON "${TARGET}" "${SOURCE}" \
        -clipsrc "${CLIPSRC}"
        
