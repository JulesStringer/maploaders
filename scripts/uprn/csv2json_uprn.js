/**
 * A utility script to convert a CSV file to a JSON lookup object.
 * It expects a CSV with at least 3 columns:
 * 1. X coordinate
 * 2. Y coordinate
 * 3. A unique key (e.g., UPRN)
 *
 * Usage: node convert-csv.js <input_file.csv> <output_file.json>
 */
const fs = require('fs');
const path = require('path');

async function convertCsvToJson(inputFile, outputFile) {
    try {
        // Read the input CSV file
        console.log(`Reading CSV from ${inputFile}...`);
        const csvData = fs.readFileSync(inputFile, 'utf8');
        const lines = csvData.split('\n');
        
        // Skip the header row
        const rows = lines.slice(1);
        
        const jsonOutput = {};

        // Process each row
        rows.forEach(line => {
            if (!line.trim()) {
                return; // Skip empty lines
            }
            const columns = line.split(',');

            // Basic validation to ensure the row has enough columns
            if (columns.length >= 3) {
                // Assuming X is column 0, Y is column 1, and the key is column 2
                const x = parseFloat(columns[0]);
                const y = parseFloat(columns[1]);
                let key = columns[2].trim();
                key = key.replace(/^"|"$/g, ''); // Fix to remove quotes

                // Build the JSON object
                jsonOutput[key] = { X: x, Y: y };
            } else {
                console.warn(`Skipping malformed row: "${line}"`);
            }
        });

        // Write the JSON object to the output file
        const jsonString = JSON.stringify(jsonOutput, null, 2);
        fs.writeFileSync(outputFile, jsonString);
        
        console.log(`Successfully converted ${rows.length} rows and saved to ${outputFile}`);
    } catch (error) {
        console.error('An error occurred during conversion:', error);
        process.exit(1);
    }
}

// Get command-line arguments
const [inputFile, outputFile] = process.argv.slice(2);

// Validate arguments
if (!inputFile || !outputFile) {
    console.error('Usage: node convert-csv.js <input_file.csv> <output_file.json>');
    process.exit(1);
}

// Run the conversion
convertCsvToJson(inputFile, outputFile);

