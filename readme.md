# OSOpenloader - A loader for OSOpenData maps
Automatically downloads the latest version of maps from the [OS Data hub](https://osdatahub.os.uk/) and converts a configurable selection of these to GeoJSON format.

+ Configurable to work with any [OSOpenData](https://docs.os.uk/os-downloads#types-of-download-data-products) product.
+ Keeps a versions file to track the product version for all downloaded source data and extracted files.
+ If a target file is missing or its version is out of date, its source data is downloaded and the file is extracted.
+ Normally `ogr2ogr` is used to extract each map layer.
+ Optionally a shell script can be used to perform a custom extract.
+ Working files (zips and expanded zips) and target GeoJSON files are stored in separate, configurable locations.
+ The project is configured via a flexible JSON file.
+ Clips map layers to a geography stored in a GeoJSON file.
# Typical Use Case
 This project is intended for a small website that uses OpenLayers or a similar library to display map layers for a specific area of the UK, such as a district or county council area. It keeps these maps up to date automatically. It is expected that map loading would be performed off-line, with the map data directory being uploaded at a later date.
 It is likely that a cron job will be defined to run this script periodically (daily?) to look for updates and install them if found.
# Compatibility & Dependencies
This project is designed to run in a **Unix-like environment** such as **Linux** or **macOS**. The scripts rely on `bash` and standard Unix command-line tools.

+ **Tested Platforms**: Ubuntu 24.0 and Raspbian Bookworm.
+ **macOS**: As macOS is a Unix-like operating system, the scripts should work, but this has not yet been formally tested.

+ For Windows users, we highly recommend installing and running the scripts from an **Ubuntu environment under the Windows Subsystem for Linux (WSL)**.
## Prerequisites & Installation
Familiarity with the command line is required.
1. ### GDAL/OGR
    `ogr2ogr` is used for data processing. The `gdal-bin` package is required.

    **On Ubuntu **: The default GDAL packages are often outdated. We recommend using the `ubuntugis` PPA for a more recent version.

    ```bash
    sudo add-apt-repository ppa:ubuntugis/ppa
    sudo apt-get update
    sudo apt-get install gdal-bin
    ogrinfo --version
```
    This last step verifies installation.

    **On Raspbian **
```bash
    sudo apt update
    sudo apt upgrade
    sudo apt install libgdal-dev
```
2. ### Node.js
    The project's main logic is a Node.js application. It was developed and tested with version 24.0.1.

    To check your current version, run
    ```bash
    node -v.

    If you need to install or update Node.js, we recommend using a version manager like nvm.
3. ### Node.js Dependencies
    Once Node.js is installed, navigate to the project directory and install the required npm packages. The package.json file handles this automatically.

    ```bash
    npm install

# Configuration
This section outlines the steps to adapt the project to your local environment and specific mapping needs.

## Project Setup:

The project zip should be downloaded from github and unzipped to a directory on your system.

As well as the directory structure you have just downloaded, you will need to create 2 other directories:
+ One for zip files (ZIPBASE) and expanded raw map files downloaded from OS. This directory is likely to get quite large whilst loading maps, but its contents can be deleted afterwards. It is not uncommon for downloaded zips to get to almost 1Gb in size of which you may only want a small part.
+ One for maps to use in the final system (PROCESSED_DIR), this will be much smaller as it will only contain maps for your area.

For the purposes of documentation I have defined these as:
```bash
    PROCESSED_DIR=/var/www/mapdata/
    ZIPBASE=/home/myuser/raw_maps/osopendata/

## Script Configuration:

The process is run from the shell script update.sh , which is as follows:

    #!/bin/bash
    PROCESSED_DIR=/var/www/mapdata/
    ZIPBASE=/home/jules/raw_maps/osopendata/
    NODE=/home/jules/.nvm/versions/node/v24.0.1/bin/node
    SCRIPTS=/home/jules/Projects/maploaders/OpenOSloader/scripts/
    ${NODE} ${SCRIPTS}update_opendata.js processed=${PROCESSED_DI

Determine the actual location of node using:
```bash
    whereis node
```
Note the location returned

Use an editor such as nano to edit this script so that:
+ PROCESSED_DIR and ZIPBASE are set to the directories you created for them.
+ NODE is set to the location of node returned from whereis (this helps later with running it as a cron job, where the environment is ofter restricted).
+ SCRIPTS is the directory the the projects scripts directory.

## config.json

There is an example_config.json in the project's scripts directory, which is a cutdown version of the live config.json which is sufficient to illustrate the main points.

This file controls which products are downloaded, types of map extracted and are covered by mapping.

+ products
```json
{
    "products":{
        "BoundaryLine": {
            "name": "Boundary line",
            "formats": [
                "ESRI® Shapefile"
            ],
            "targets": [
                {
```
This object's key is the id of an OS product listed in the [products list](https://api.os.uk/downloads/v1/products) on the OS Data Hub. So this file is configured to load [BoundaryLine]() and [OpenMapLocal](). products should have:
+ name - name of the product
+ areas - optional list of areas to select the areas of interest for products that specify this.
+ formats a list of map formats that should be downloaded

*targets* in the above describes the shp files you want to load and where you want to put the resulting files. With the OpenMapLocal example there are two targets buildings and natural_environment showing that a product can be partitioned into different directories in the loader.
```json
            "targets": [
                {
                    "directory":"boundaries",
                    "datasets": [
                        {
                            "targets":["Teignbridge.json"],
                            "source":"Data/GB/district_borough_unitary_region.shp",
                            "where":"CODE IN ('E07000045')"
                        },
                        {
                            "targets":["TeignbridgeWards.json"],
                            "source":"Data/GB/district_borough_unitary_electoral_division_region.shp",
                            "where":"CODE IN (@codes)",
                            "where_codes": ["E05011905","E05011912","E05011910","E05011895","E05011899","E05011909","E05011908",
                                            "E05011906","E05011901","E05011902","E05011914","E05011913","E05011915","E05011915",
                                            "E05011896","E05011898","E05011897","E05011900","E05011892","E05011893","E05011904",
                                            "E05011903","E05011907","E05011911" ]
                        }
                    ]
                }
```
Each top level target has 
+ a directory within PROCESSED_DIR which contains loaded maps. 
+ datasets each of these controls the action of a script
```json
                        {
                            "targets":["Teignbridge.json"],
                            "source":"Data/GB/district_borough_unitary_region.shp",
                            "where":"CODE IN ('E07000045')"
                        },
```
+ targets is a list of json files output to directory
+ source is the path within the zip file (unzipped) for the file to extract the json from.
+ sourcefiles list of source files to be loaded within a single zip only used where there are many sources per zip
+ where clause to filter features for inclusion in the extracted dataset, @codes in a where clause is substituted for a list 
+ where_codes array of codes to be formatted as a comma separated string and replace @codes in the where clause
+ script is an optional shell script within the target's directory within scripts that performs the extract.
In this example `Teignbridge.json` is the district council boundary, and
`district council boundary_region.shp` is a shape file containing all the boundaries for that teir of government within GB. The reason only one boundary is extracted is that the where clause restrict the extract to that districts unique code.

The next example shows the use of a list of codes and @codes to make it a bit easier to enter the list into json
```json
                        {
                            "targets":["TeignbridgeWards.json"],
                            "source":"Data/GB/district_borough_unitary_electoral_division_region.shp",
                            "where":"CODE IN (@codes)",
                            "where_codes": ["E05011905","E05011912","E05011910","E05011895","E05011899","E05011909","E05011908",
                                            "E05011906","E05011901","E05011902","E05011914","E05011913","E05011915","E05011915",
                                            "E05011896","E05011898","E05011897","E05011900","E05011892","E05011893","E05011904",
                                            "E05011903","E05011907","E05011911" ]
```
This shows the use of @codes to put a list of area codes in the where clause for selection.

Loading postcodes from Code Point GB is an example of loading from a different format to a different format, here to a custom
storage for postcodes which provides a simple natural index based on file name. This uses a custom node script postcodes/js/loaders.js to read the source csv files and generate the index. This node script is initiated by a shell script postcode.sh
```json
        "CodePointOpen": {
            "name": "Code Point Open",
            "formats": [
                "CSV"
            ],
            "script":"postcodes/",
            "targets": [
                {
                    "directory":"postcodes",
                    "datasets":[
                        {
                            "targets":["EX1.json"],
                            "source":"Data/CSV/",
                            "sourcefiles":["ex.csv","pl.csv","tq.csv"],
                            "script":"postcode.sh"
                        }
                    ]
                }
            ]
        },
```
Here the format is CSV and the unzipped source folder contains csv file for each GB postcode out code. We only want to load
postcodes starting ex, pl, tq so we list the required source files in the sourcefiles field, and specify the path to these within
the zip in source. We need to name at least one target (EX1.json) to ensure that the process detects something missing.

The OpenMapLocal example below illustrates some other features:
+ The ability to specify an already loaded boundary as a clipping limit to geometries in a file. In this case we limit building and woodland to the teignbridge boundary that is loaded earlier in the config.
+ The ability to pick which OS tiles are extracted from a product, this is important where supply is in 100X100km tiles or 10X10km tiles. Here tiles use the OS sheet naming conventions. The list of available downloads is in the product's url given in the products list.
+ The ability to specify multiple targets for a product.
```json
        "OpenMapLocal": {
            "name": "OS Open Map Local",
            "script": "openmaplocal/",
            "areas": [
                "SX"
            ],
            "formats": [
                "ESRI® Shapefile"
            ],
            "clip":"/boundaries/Teignbridge.json",
            "targets": [
                {
                    "directory":"buildings",
                    "datasets":[
                        {
                            "targets":["building.json"],
                            "source":"OS OpenMap Local (ESRI Shape File) SX/data/SX_Building.shp"
                        }
                    ]
                },
                {
                    "directory":"natural_environment",
                        "datasets":[
                        {
                            "targets":["woodland.json"],
                            "source":"OS OpenMap Local (ESRI Shape File) SX/data/SX_Woodland.shp"
                        }
                    ]
                }
            ]
        }
    }
}
```

## Running the Script:

It is suggested that if you want to check that it all works with a minimal set of outputs that you swap config.json for example_config.json, and then run update.sh from the command line:
```bash
./update.sh
```
If all is set up correctly this should download and extract some json files to PROCESSED_DIR

## Adding scripts for further extracts

The script to load postcodes looks like
```bash
### postcode.sh
#!/bash
NODE=/home/jules/.nvm/versions/node/v24.0.1/bin/node
${NODE} ./js/loader.js --sourcefiles="${SOURCES}" --source="${SOURCE}" --targetdir="${TARGET_DIR}"
```

Though superceded, Typical scripts to extract json files look like
### teignbridge.sh
```bash
#!/bin/bash
TARGET="${TARGET_DIR}Teignbridge.json"
rm ${TARGET}
ogr2ogr -f GeoJSON "${TARGET}" ${SOURCE} \
        -where "CODE IN ('E07000045')"
```
The script's environment is set according settings in config.json

### Environment variables
The following environment variables are provided:
|Variable|Content|
|--------|-------|
|PATH|is extended to include the likely installed locations of ogr2ogr|
|ZIPBASE|value passed from update.sh|
|PROCESSED_DIR|value passed from update.sh|
|SOURCE|path of the unzipped file or folder supports substitution of {VERSION} for the product version without embedded|
|SOURCEFILES|list of files to be processed|
|TARGET_DIR|directory to contain the output data|
|TARGET|if there is only one output file for a source, this is its full path|
|TARGETS|if there is more than one output file for a source|
|CLIPSRC|set to the clip field if set on the product, target or dataset|
|WHERE|expanded version of the where clause|
|MAPDATA|same as processed_dir|

Provide the final command to run the script: ./update.sh.

### Versions files
As well as keeping a record of the current version of each map, the versions files could be used by a remote utility to synchronise maps. There is a versions file in each target directory the following is an example from the boundaries folder:
```json
{
    "Teignbridge.json": {
        "version": "2025-05",
        "loaded": "2025-08-11T13:55:05.839Z"
    },
    "Devon.json": {
        "version": "2025-05",
        "loaded": "2025-08-11T13:55:06.451Z"
    },
    "DevonConstituencies.json": {
        "version": "2025-05",
        "loaded": "2025-08-11T13:55:08.113Z"
    },
    "DevonWards.json": {
        "version": "2025-05",
        "loaded": "2025-08-11T13:55:09.737Z"
    },
    "TeignbridgeParishes.json": {
        "version": "2025-05",
        "loaded": "2025-08-12T17:29:18.793Z"
    },
    "TeignbridgeWards.json": {
        "version": "2025-05",
        "loaded": "2025-08-11T18:53:17.309Z"
    }
}
```
### Synchronising local copies of layers on websites.
This can be achieved using [syncmaps.php](https://github.com/JulesStringer/syncmaps) 

## Known Issues
This section will list any known bugs or limitations.

## Changes in this version
26/8/2025
Removed UPRN load as now using ONS derived UPRNs
25/8/2025
Functions getjson, getdata, executeScript, executeogr, unzipFile moved to utils.js from update_opendata.js and exported as now used by other scripts. This makes it clearer. Also optional headers passed to getjson and getdata so that User-agent and/or Authorization can be set. 
20/8/2025
+ E04013236 parish code added for Newton Abbot to relect ONS 2023 change
17/8/2025
+ Changed to using unzipper library instead of yauzl as this is more tolerant of leading / on directory names.
12/8/2025
+ Added processing of OpenUPRN product to a csv and uprn_lookup.json which also looks up polygon codes such as Porish and Ward - see scripts/uprn/uprn.sh for more
11/8/2025
+ For Most layers ogr2ogr is used to generate a single output file from a shp file with an optional where clause and clipping polygon. In these cases no .sh file is necessary.
+ Script and config have been implemented to load postcodes from CodePointGB to a custom csv format.

## Further work
+ Shell script for examples like height grids (Panorama), raster data (), csv files. Also to perform bespoke follow on procedures such as setting additional attributes that might be needed by the application.
+ GUI front end to set up the config file based on date in the OS Data Hub API.
