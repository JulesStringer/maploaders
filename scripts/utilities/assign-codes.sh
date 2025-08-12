#!/bin/bash
# Navigate to the directory where the script is located
cd "$(dirname "$0")"
echo "Coverting polygons to WGS84"
set -x
ogr2ogr -f GeoJSON temp_polygons.json "${POLYGONS}" -t_srs EPSG:4326
set +x
echo "Timestamp: $(date +%Y-%m-%d\ %H:%M:%S)"
echo "Assigning ${POINT_CODE} to points"
set -x
node assign-codes.js points=$TARGET_POINTS polygons=temp_polygons.json polygon_code=$CODE point_code=$POINT_CODE output=$OUTPUT_FILE
set +x
rm temp_polygons.json
