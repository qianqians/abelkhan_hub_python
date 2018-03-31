function configLogger(logfilepath, _level){
    var log4js = require('log4js');
    log4js.configure({
        appenders: {
            normal: {
                type: 'file',
                filename: logfilepath, 
                maxLogSize: 1024*32,
                backups: 3,
            }
        },
        categories: {default: { appenders: ['normal'], level: _level }}
    });
}

function getLogger(){
    var log4js = require('log4js');
    return log4js.getLogger('normal');
}