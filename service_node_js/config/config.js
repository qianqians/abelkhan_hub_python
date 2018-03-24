function config(cfgfilepath){
    var fs = require('fs');
    var data = fs.readFileSync(cfgfilepath, 'utf8');
    var obj = JSON.parse(data.toString());
    return obj;
}
module.exports.config = config;