const fs = require('fs');
const utils = require('./utils.js');

let zips_dir = __dirname + '/../osopendata/';
let processed_dir = __dirname + '/../mapdata/';

async function gettargetstatus(current, product){
    // returns a structure with status of targets
    let unprocessed_targets = [];
    if ( current.targets){
        for(let target of current.targets){
            // directory exists
            let hastarget = true;
            let testdir = processed_dir + target.directory
            console.log('Checking target directory: ' + testdir);
            await fs.promises.access(testdir, fs.constants.R_OK).catch(async(err) => {
                console.log('Creating ' + testdir);
                await fs.promises.mkdir(testdir);
                hastarget = false;
            });
            let work_target = {
                directory: testdir,
                datasets:[]
            };
            // check version number
            let versionfile = testdir + '/versions.json';
            console.log('Checking ' + versionfile);
            let versions = {};
            work_target.versionfile = versionfile;
            try {
                const data = await fs.promises.readFile(versionfile);
                versions = JSON.parse(data);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    console.log(`File not found: ${versionfile}. Initializing with empty version.`);
                    versions = {};
                } else {
                    console.error(`Error reading version file: ${err.message}`);
                    throw err;
                }
            }
            work_target.versions = versions;

            for(let dataset of target.datasets){
                let ds = {
                    targets:[],
                    script: dataset.script,
                    source: dataset.source
                }
                for(let key in dataset){
                    if ( key != 'targets' ){
                        ds[key] = dataset[key];
                    }
                }
                console.log('Product version: ' + product.version);
                for(let file of dataset.targets){
                    let hasversion = false;
                    let fver = versions[file] ? versions[file].version : 'none';
                    console.log('Checking ' + file + ' version ' + fver);
                    if ( fver == product.version ){
                        hasversion = true;
                    }
                    let testfile = testdir + '/' + file;
                    let hasfile = true;
                    await fs.promises.access(testfile, fs.constants.R_OK).catch(async(err) => {
                        hasfile = false;
                        console.log('Failed to access ' + testfile);
                    });
                    if ( hasversion == false || hasfile == false ){
                        console.log('Adding ' + file + ' to dataset ' + dataset.script);
                        console.log('Adding: ' + testfile);
                        ds.targets.push(testfile);
                    }
                }
                if ( ds.targets.length > 0 ){
                    work_target.datasets.push(ds);
                }
            }
            if ( work_target.datasets.length > 0){
                unprocessed_targets.push(work_target);
            }
        }
    }
    console.log('There were ' + unprocessed_targets.length + ' targets to process');
    return unprocessed_targets;
}
async function getfilesize(filepath){
    let stat = await fs.promises.stat(filepath);
    let filesize = stat.size / 1024 / 1024; // size in MB
    return filesize;
}
function getfilename(path){
    return path.split('/').pop();
}
async function buildlayersfile(config){
    const layersfile = processed_dir + 'layers.json';
    console.log('Building ' + layersfile);
    let layerdata = await fs.promises.readFile(layersfile).catch(err => {
        if ( err.code === 'ENOENT'){
            console.log('File did not exist');
            let layerdata = '{}';
            return layerdata;
        }
        console.log('Error code: ' + err.code);
    });
    console.log('layerdata '+layerdata);
    let layers = JSON.parse(layerdata);
    for(const productid in config.products){
        let product = config.products[productid];
        for(const target of product.targets){
            let basepath = processed_dir + target.directory + '/';
            for(const dataset of target.datasets){
                if ( dataset.layerid){
                    let layer = {
                        path:basepath + dataset.targets[0],
                        location:"local"
                    };
                    layers[dataset.layerid] = layer;
                }
            }
        }
    }
    await fs.promises.writeFile(layersfile, JSON.stringify(layers));
    console.log('Updated layers file ' + layersfile);
}
async function run(){
    let products = await utils.getjson('https://api.os.uk/downloads/v1/products');
    let config_data = await fs.promises.readFile(__dirname + "/config.json");
    let config = JSON.parse(config_data);
    let updated = false;
    // check processed and zips directories exist
    console.log('Creating ' + zips_dir);
    await fs.promises.mkdir(zips_dir).then(() => {
        console.log('Created ' + zips_dir);
    }).catch((err) =>{
        if (err.code === 'EEXIST'){
            console.log(zips_dir + ' already exists');
        } else {
            console.log(err + ' creating');
            throw err;
        }
    });
    for( let product of products){
        console.log('Product: ' + product.id);
        let current = config.products[product.id];
        if ( current ){
            console.log('checking ' + current.name);
            let unprocessed = await gettargetstatus(current, product);
            if ( unprocessed.length > 0 ){
                console.log('Updating ' + product.id);
                // download product
                let product_detail = await utils.getjson(product.url);
                let downloads = await utils.getjson(product_detail.downloadsUrl);
                for(let download of downloads){
                    let hasformat = false;
                    for(let format of current.formats){
                        if ( format === download.format){
                            hasformat = true;
                        }
                    }
                    if ( hasformat ){
                        let hasarea = true;
                        if ( current.areas ){
                            hasarea = false;
                            for(let area of current.areas){
                                if ( download.url.indexOf('area=' + area) > 0){
                                    hasarea = true;
                                }
                            }
                        }
                        if ( hasarea ){
                            //
                            // Download zip file
                            // Unzip 
                            // Run Script
                            // Update version
                            // Delete zip file
                            //
                            let filepath = zips_dir + download.fileName;
                            console.log('Downloading ' + filepath);
                            await utils.getdata(download.url, filepath);
                            console.log('Downloaded ' + filepath);
                            // unzip to 
                            //let zipped = filepath;
                            //console.log('zipped ' + zipped);
                            let unzipped = filepath.replace('.zip','');
                            console.log('unzipping to ' + unzipped);
                            await utils.unzipFile( filepath, unzipped);
                            console.log('Unzipped ' + filepath + ' to ' + unzipped);
                            // now run shell script
                            let clip = current.clip;
                            for(let target of unprocessed ){
                                if ( target.clip ){
                                    clip = target.clip;
                                }
                                for(let dataset of target.datasets){
                                    if ( dataset.clip ){
                                        clip = dataset.clip
                                    }
                                    let source = dataset.source.replace('{VERSION}', product.version.replace('-', ''));
                                    let environment = {
                                        SOURCE: unzipped + '/' + source,
                                        TARGET_DIR: target.directory + '/',
                                        MAPDATA_DIR: processed_dir,
                                        ZIPBASE: zips_dir, // Custom variable for the zips directory
                                        PROCESSED_DIR: processed_dir // Custom variable for the processed data directory
                                    };
                                    if ( dataset.sourcefiles){
                                        // this must be done by script
                                        environment['SOURCEFILES'] = dataset.sourcefiles;
                                    }   
                                    if ( clip ){
                                        environment['CLIPSRC'] = processed_dir + '/' + clip;
                                    }
                                    if ( dataset.where ){
                                        let where = dataset.where;
                                        if ( dataset.where_codes ){
                                            where = where.replace('@codes', "'" + dataset.where_codes.join("','") + "'");
                                        }
                                        console.log('Where: ' + where);
                                        environment['WHERE'] = where;
                                    }
                                    if ( dataset.targets.length == 1 ){
                                        environment['TARGET'] = dataset.targets[0];
                                    } else {
                                        environment['TARGETS'] = dataset.targets;
                                    }
                                    if ( dataset.script ){
                                        let scriptpath = __dirname + '/' + current.script + dataset.script;
                                        console.log('Executing ' + scriptpath);
                                        await utils.executeScript(scriptpath, environment);
                                        console.log('Executed ' + scriptpath);
                                    } else {
                                        await utils.executeogr(environment)
                                    }
                                    // Report file sizes
                                    for(let j = 0; j < dataset.targets.length; j++){
                                        let filesize = await getfilesize( dataset.targets[j]);
                                        console.log('File size of ' + dataset.targets[j] + ' is ' + filesize.toFixed(2) + ' MB');
                                        // update version
                                        let d = new Date();
                                        let version = {
                                            "version":product.version,
                                            "loaded":d.toISOString()
                                        }
                                        let key = getfilename(dataset.targets[j]);
                                        target.versions[key] = version;
                                    }
                                }
                                
                                await fs.promises.writeFile(target.versionfile, JSON.stringify(target.versions));
                                console.log("Written " + target.versionfile);
                            }
                            await fs.promises.rm(filepath);
                            console.log('Deleted ' + filepath);
                        }
                    }
                }
            }
        }
    }
    await buildlayersfile(config);
}
const args = process.argv.slice(process.execArgv.length + 2);
for(let arg of args){
    if ( arg.startsWith('processed=')){
        processed_dir = arg.split("=")[1];
        console.log('Processed files will be stored under: ' + processed_dir);
    }
    if( arg.startsWith('zips=')){
        zips_dir = arg.split("=")[1];
        console.log('Zip and intermediate files will be stored under: ' + zips_dir);
    }
}
run().then(()=>{
    console.log('Finished');
    //process.exit(0);
}).catch((err)=>{
    console.error(err.toString());
    process.exit(-1);
});