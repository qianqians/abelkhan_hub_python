function logger(logfilepath){
    var log4js = require('log4js');
    log4js.configure({
        appenders: [
            {   
                type: 'console' 
            }, 
            {
                type: 'file',
                filename: logfilepath, 
                maxLogSize: 1024*32,
                backups: 3,
                category: 'normal' 
            }
        ]
    });
    
    return logger = log4js.getLogger('normal');
}