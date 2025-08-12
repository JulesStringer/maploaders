const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');
const yauzl = require('yauzl');
const path = require('path');

let zips_dir = __dirname + '/../osopendata/';
let processed_dir = __dirname + '/../mapdata/';

async function getjson(url){
    return new Promise((resolve, reject) => {
        let req = https.get(url,function(res){
            let err = null;
            if ( res.statusCode != 200 ){
                err = new Error('Bad status ' + res.statusCode);
                console.log(JSON.stringify(res));
            } else {
                let data = '';
                res.on('data', function(chunk){
                    data += chunk;
                });
                res.on('end', function(){
                    if ( err ){
                        console.log(data);
                        reject(err);
                    } else {
                        try{
                            let json = JSON.parse(data);
                            resolve(json);
                        }catch(err){
                            reject(err);
                        }
                    }
                });
            }
        });
        req.end();
    });
}
async function getdata(url, filepath){
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {

            // Check for a redirect
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                const redirectUrl = response.headers.location;
                // Recursive call to follow the redirect
                getdata(redirectUrl, filepath).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }

            const fileStream = fs.createWriteStream(filepath);

            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });

            fileStream.on('error', (err) => {
                // If there's an error with the file stream, clean up and reject
                fs.unlink(filepath, () => {
                    reject(err);
                });
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}
async function executeScript(scriptPath, environment) {
    return new Promise((resolve, reject) => {
        console.log(`Executing: sh ${scriptPath}`); // Log the full path for debugging
        const scriptDirectory = path.dirname(scriptPath); // Get the directory of the script
        const newPath = `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH}`;
 
        let env = {
             ...process.env, 
            PATH:newPath,
            ZIPBASE: zips_dir, // Custom variable for the zips directory
            PROCESSED_DIR: processed_dir // Custom variable for the processed data directory
        }
        for(let key in environment){
            env[key] = environment[key]            
        }
 
        const child = exec(`sh ${scriptPath}`, {
            cwd: scriptDirectory, // Set the current working directory
            env: env
        });

        child.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        child.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(`Child process exited with code ${code}`);
            } else {
                reject(new Error(`Child process exited with code ${code}`));
            }
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
}
async function executeogr(environment) {
    return new Promise((resolve, reject) => {
        let cmd = `ogr2ogr -f GeoJSON "${environment.TARGET}" "${environment.SOURCE}"`;
        if ( environment.WHERE ){
            cmd += ` -where "${environment.WHERE}"`;
        }
        if ( environment.CLIPSRC ){
            cmd += ` -clipsrc "${environment.CLIPSRC}"`;
        }
        console.log('Executing: ' + cmd);
        const child = exec(cmd, { env: process.env });

        child.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        child.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(`Child process exited with code ${code}`);
            } else {
                reject(new Error(`Child process exited with code ${code}`));
            }
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
}
async function unzipFile(zippedFilePath, destinationPath) {
    await fs.promises.rm(destinationPath, { recursive: true, force: true });
    // Ensure the destination directory exists
    await fs.promises.mkdir(destinationPath, { recursive: true });

    return new Promise((resolve, reject) => {
        yauzl.open(zippedFilePath, { lazyEntries: true }, (err, zipfile) => {
            if (err) {
                return reject(err);
            }
//console.log('yauzl opened ' + zippedFilePath);
            zipfile.readEntry();

            zipfile.on('entry', (entry) => {
                const entryPath = path.join(destinationPath, entry.fileName);

                // Handle directories
                if (/\/$/.test(entry.fileName)) {
                    fs.promises.mkdir(entryPath, { recursive: true })
                        .then(() => zipfile.readEntry())
                        .catch(reject);
                } else {
                    // Handle files
                    zipfile.openReadStream(entry, (err, readStream) => {
                        if (err) {
                            return reject(err);
                        }
                        
                        readStream.on('error', reject);

                        const writeStream = fs.createWriteStream(entryPath);
                        writeStream.on('error', reject);
                        
                        writeStream.on('finish', () => {
                            zipfile.readEntry();
                        });

                        readStream.pipe(writeStream);
                    });
                }
            });

            zipfile.on('end', () => {
                resolve(`Successfully unzipped to ${destinationPath}`);
            });

            zipfile.on('error', reject);
        });
    });
}
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
async function run(){
    let products = await getjson('https://api.os.uk/downloads/v1/products');
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
                let product_detail = await getjson(product.url);
                let downloads = await getjson(product_detail.downloadsUrl);
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
                            await getdata(download.url, filepath);
                            console.log('Downloaded ' + filepath);
                            // unzip to 
                            //let zipped = filepath;
                            //console.log('zipped ' + zipped);
                            let unzipped = filepath.replace('.zip','');
                            console.log('unzipped ' + unzipped);
                            await unzipFile( filepath, unzipped);
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
                                        await executeScript(scriptpath, environment);
                                        console.log('Executed ' + scriptpath);
                                    } else {
                                        await executeogr(environment)
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