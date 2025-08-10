#!/bin/bash
TARGET="${TARGET_DIR}woodland.json"
rm "${TARGET}"
ogr2ogr -f GeoJSON "${TARGET}" "${SOURCE}" \
        -clipsrc "${CLIPSRC}"
