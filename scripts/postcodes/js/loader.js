const fs = require('fs');
// list of files to process
let sourcefiles = ["ex.csv", "pl.csv", "tq.csv"];
let csvfolder = __dirname + '/../codepo/CSV/';
let jsonfolder = __dirname + '/../postcodes/';
const allcodes = {};

async function processfile(filename){
    // Form an object for each out code.
    // this object has members identified by postcode containing E and N.
    // write a separate file for each out code.
    var filepath = csvfolder + filename;
    var csvdata = await fs.promises.readFile(filepath, 'utf-8');
    var lines = csvdata.split(/\r\n|\n/);
    var obj = {};

    lines.forEach(function (line, index) {
        var fields = line.split(',');
        var postcode = fields[0].replace('"', '');
        postcode = postcode.replace('"', '');
        var outcode = postcode.substr(0, 4);
        outcode = outcode.replace(' ', '');
        var outrec = null;
        if (obj[outcode] == null) {
            outrec = {};
            obj[outcode] = outrec;
        } else {
            outrec = obj[outcode];
        }
        outrec[postcode] = { E: parseInt(fields[2]), N: parseInt(fields[3]) };
        allcodes[postcode] = outrec[postcode];
    });
    for (var outc in obj) {
        var fpath = jsonfolder + outc + '.json';
        var outrec = obj[outc];
        var env = null;
        for (var pc in outrec) {
            var coord = outrec[pc];
            if (env == null) {
                env = { minx: coord.E, miny: coord.N, maxx: coord.E, maxy: coord.N };
                env.minx = env.maxx = coord.E;
                env.miny = env.maxy = coord.N;
            } else {
                if (coord.E < env.minx) env.minx = coord.E;
                if (coord.N < env.miny) env.miny = coord.N;
                if (coord.E > env.maxx) env.maxx = coord.E;
                if (coord.N > env.maxy) env.maxy = coord.N;
            }
        }
        outrec.envelope = env;
        var strdata = JSON.stringify(outrec);
        await fs.promises.writeFile(fpath, strdata);
    }
}
async function processcsv() {
    for(let filename of sourcefiles) {
        await processfile(filename);
    }
    var allfile = jsonfolder + '/postcodes.json';
    await fs.promises.writeFile(allfile, JSON.stringify(allcodes));
}
const args = process.argv.slice(2);
for(let arg of args){
    if ( arg.startsWith('--source=') ){
        csvfolder = arg.split('=')[1];
        //console.log('source ;' + csvfolder);
    }
    if ( arg.startsWith('--sourcefiles=')){
        let list = arg.split('=')[1];
        sourcefiles = list.split(',');
        //console.log('Source files: ' + sourcefiles.toString());
    }
    if ( arg.startsWith('--targetdir=')){
        jsonfolder = arg.split('=')[1].replace(/"/g, '');
        //console.log('Target diretory: ' + jsonfolder);
    }
}
processcsv().then(() =>{
    console.log('Finished');
}).catch((err) =>{
    console.log(err.toString());
});
