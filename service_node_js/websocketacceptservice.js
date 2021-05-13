function websocketacceptservice(host, port, is_ssl, certificate, private_key, _process){
    eventobj.call(this);
    var that = this;
    var WebSocket = require('ws');

    if (is_ssl){
        var https = require('https');
        var fs = require('fs');
        var keypath = private_key;
        var certpath = certificate;
        var options = {
            key: fs.readFileSync(keypath),
            cert: fs.readFileSync(certpath)
        };
        var server=https.createServer(options, function (req, res) {
            res.writeHead(403);
            res.end("This is a  WebSockets server!\n");
        }).listen(port);
    
        var webServer = new WebSocket.Server({server:server});
        this.process = _process;
        webServer.on('connection', function connection(ws) {
            var ch = new websocketchannel(ws);
            ch.add_event_listen('ondisconnect', that, function(ch){
                _process.unreg_channel(ch);
                that.call_event("on_channel_disconnect", [ch]);
            });
            _process.reg_channel(ch);
            that.call_event("on_channel_connect", [ch]);
        });
    }
    else{
        var webServer = new WebSocket.Server({port:port});
        this.process = _process;
        webServer.on('connection', function connection(ws) {
            var ch = new websocketchannel(ws);
            ch.add_event_listen('ondisconnect', that, function(ch){
                _process.unreg_channel(ch);
                that.call_event("on_channel_disconnect", [ch]);
            });
            _process.reg_channel(ch);
            that.call_event("on_channel_connect", [ch]);
        });
    }
    
}
