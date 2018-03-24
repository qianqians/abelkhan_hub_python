function connectservice(_process){
    eventobj.call(this);

    this.process = _process;

    this.connect = function(ip, port, cb_this_argv, cb){
        var net = require('net');
        var sock = new net.Socket();
        sock.connect(port, ip, function(){
            var ch = new channel(sock);
            ch.add_event_listen("ondisconnect", this, this.on_channel_disconn);
    
            this.process.reg_channel(ch);

            cb.call(cb_this_argv, ch);
        });
    }

    this.on_channel_disconn = function(ch){
        this.call_event("on_ch_disconn", [ch]);
        this.process.unreg_channel(ch);
    }

}