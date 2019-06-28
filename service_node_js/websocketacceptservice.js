function acceptservice(ip, port, _process){
    eventobj.call(this);
    var that = this;
    var WebSocket = require('ws');
    var webServer = new WebSocket.Server({port:port});
    this.process = _process;
    webServer.on('connection', function connection(ws) {
        var ch = new channel(ws);
        ch.add_event_listen('ondisconnect', that, function(ch){
            _process.unreg_channel(ch);
            that.call_event("on_channel_disconnect", [ch]);
        });
        _process.reg_channel(ch);
        getLogger().trace("xxxxxxxxxwebServers");
        that.call_event("on_channel_connect", [ch]);
    });
}
