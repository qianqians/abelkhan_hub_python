var log4js = require('log4js');
function configLogger(logfilepath, _level){
    log4js.configure({
        appenders: {
            normal: {
                type: 'file',
                filename: logfilepath,
                maxLogSize: 1024*1024*32,
                backups: 3,
                layout: {
                    type: 'pattern',
                    pattern: '%d %p %m%n',
                }
            }
        },
        categories: {default: { appenders: ['normal'], level: _level }}
    });
}

function getLogger(){
    return log4js.getLogger('normal');
}
module.exports.getLogger = getLogger;