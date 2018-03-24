function acceptservice(ip, port, _process){
    eventobj.call(this);
    this.process = _process;

    var net = require('net');
    this.server = net.createServer(function(s){
        var ch = new channel(s);
        ch.add_event_listen('ondisconnect', this, function(ch){
            this.process.unreg_channel(ch);
            this.call_event("on_channel_disconnect", [ch]);
        });

        this.process.reg_channel(ch);
        this.call_event("on_channel_connect", [ch]);
    }).listen(port, ip);

}