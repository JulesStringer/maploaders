const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const unzipper = require('unzipper');

async function getjson(url, headers){
    let options = {};
    if ( headers ){
        options.headers = headers;
    };
    return new Promise((resolve, reject) => {
        let req = https.get(url, options, function(res){
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
exports.getjson = getjson;
async function getdata(url, filepath, headers){
    let options = {};
    if ( headers ){
        options.headers = headers;
    }
    return new Promise((resolve, reject) => {
        https.get(url, options, (response) => {

            // Check for a redirect
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                const redirectUrl = response.headers.location;
                // Recursive call to follow the redirect
                getdata(redirectUrl, filepath, headers).then(resolve).catch(reject);
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
exports.getdata = getdata;
async function executeScript(scriptPath, environment) {
    return new Promise((resolve, reject) => {
        console.log(`Executing: sh ${scriptPath}`); // Log the full path for debugging
        const scriptDirectory = path.dirname(scriptPath); // Get the directory of the script
        const newPath = `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${process.env.PATH}`;
 
        let env = {
             ...process.env, 
            PATH:newPath
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
exports.executeScript = executeScript;
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
exports.executeogr = executeogr;
async function unzipFile(zippedFilePath, destinationPath) {
    console.log(`Unzipping to ${destinationPath}`);

    // Ensure the destination directory exists and is empty
    await fs.promises.rm(destinationPath, { recursive: true, force: true });
    await fs.promises.mkdir(destinationPath, { recursive: true });

    return new Promise((resolve, reject) => {
        fs.createReadStream(zippedFilePath)
            .pipe(unzipper.Extract({ path: destinationPath }))
            .on('entry', entry => {
                // unzipper correctly handles the directory structure
                console.log(`Extracting: ${entry.path}`);
            })
            .on('error', err => {
                console.error('Extraction error:', err);
                reject(err);
            })
            .on('close', () => {
                console.log('Successfully unzipped all files.');
                resolve(`Successfully unzipped to ${destinationPath}`);
            });
    });
}
exports.unzipFile = unzipFile;
