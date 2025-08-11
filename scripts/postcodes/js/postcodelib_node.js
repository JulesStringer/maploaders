const fs = require('fs');
// jsonfolder = __dirname + '/../postcodes/';

async function get_coord_from_postcode(postcode, jsonfolder) {
    if (postcode.length == 6) {
        postcode = postcode.substr(0, 3) + " " + postcode.substr(3);
    }
    else if (postcode.length == 7 && !postcode.indexOf(' ')) {
        //var ar = postcode.split(" ");
        //postcode = ar[0] + ar[1];
        postcode = postcode.substr(0,4) + ' ' + postcode.substr(3);
    }
    postcode = postcode.toUpperCase();
    //console.log('Postcode: ' + postcode);
    var outcode = postcode.substr(0, 4);
    outcode = outcode.replace(" ", "");
    var fpath = jsonfolder + outcode + ".json";
    //console.log('fpath: ' + fpath);
    // this could be called from a web request.
    var data = await fs.promises.readFile(fpath, { encoding: 'utf-8' });
    var obj = JSON.parse(data);
    return obj[postcode];
}
exports.get_coord_from_postcode = get_coord_from_postcode;
