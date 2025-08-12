/**
 * A generalized script to assign polygon codes to points.
 * It expects point data in EPSG:27700 and performs a CRS transformation
 * to WGS84 (EPSG:4326) for use with Turf.js.
 *
 * This version uses a 'key=value' format for command-line arguments,
 * making the argument order irrelevant.
 *
 * @requires proj4: npm install proj4
 * @requires @turf/helpers: npm install @turf/helpers
 * @requires @turf/boolean-point-in-polygon: npm install @turf/boolean-point-in-polygon
 */
const fs = require('fs');
const turf = require('@turf/turf');
const { point } = require('@turf/helpers');
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon');
//const { point, booleanPointInPolygon } = require('@turf/helpers');
const proj4 = require('proj4');

// Define the source (EPSG:27700) and target (EPSG:4326) CRS
const sourceCRS = 'EPSG:27700';
const targetCRS = 'EPSG:4326';

// Define the Proj4js projections for both CRS
proj4.defs(sourceCRS, '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +datum=osgb36 +units=m +no_defs');
proj4.defs(targetCRS, '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs');

async function processData(params) {
    try {
        // Get parameters from the parsed arguments object
        const { points: pointsFile, polygons: polygonsFile, polygon_code: codeAttrName, point_code: pointCodeAttrName, output: outputFile } = params;

        // Load the geospatial data
        let polygonsData, pointsData;
        try{
            polygonsData = JSON.parse(fs.readFileSync(polygonsFile, 'utf8'));
        } catch(err){
            console.error(`Error reading polygons file: ${polygonsFile}`);
            console.error(err);
            process.exit(1);
        };
        console.log('Read polygons');
        try{
            console.log('Reading points from', pointsFile);
            pointsData = JSON.parse(fs.readFileSync(pointsFile, 'utf8'));
        } catch(err) {
            console.error(`Error reading points file: ${pointsFile}`);
            console.error(err);
            process.exit(1);
        }
        console.log('Read points');
        // Prepare the results object with a copy of the original points datach
        let results = JSON.parse(fs.readFileSync(pointsFile, 'utf8'));

        console.log(`Processing points from ${pointsFile}...`);

        // Iterate through each point and transform its coordinates
        for (const lkey in pointsData) {
            const { X, Y } = pointsData[lkey];

            // Transform the coordinates from EPSG:27700 to WGS84
            const [lon, lat] = proj4(sourceCRS, targetCRS, [X, Y]);
            const currentPoint = point([lon, lat]);
            let foundCode = null;

            // Iterate through each polygon to find a match
            for (const feature of polygonsData.features) {
                const polygon = feature.geometry;
                const polygonCode = feature.properties[codeAttrName];

                // Check if the point is inside the polygon
                if (turf.booleanPointInPolygon(currentPoint, polygon)) {
                    foundCode = polygonCode;
                    break; // Exit the inner loop once a match is found
                }
            }

            // Assign the found code to the specified attribute in the results object
            results[lkey][pointCodeAttrName] = foundCode;
        }

        // Save the results to the output file
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`Successfully assigned codes and saved to ${outputFile}`);
    } catch (error) {
        console.error('An error occurred:', error);
        process.exit(1);
    }
}

// Parse command-line arguments in 'key=value' format
const params = {};
process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.split('=');
    if (key && value) {
        params[key] = value;
    }
});

// Validate that all required arguments are provided
const requiredKeys = ['points', 'polygons', 'polygon_code', 'point_code', 'output'];
const missingKeys = requiredKeys.filter(key => !params[key]);

if (missingKeys.length > 0) {
    console.error(`Missing required arguments: ${missingKeys.join(', ')}`);
    console.error('Usage: node assign-codes.js points=<points.json> polygons=<polygons.geojson> polygon_code=<polygon_code_attr> point_code=<point_code_attr> output=<output.json>');
    process.exit(1);
}

// Run the main processing function
processData(params).then(()=> {
    console.log(('Finished adding codes to polygons'));
}).catch(error => {
    console.error('Error during processing:', error);
    process.exit(1);
});
