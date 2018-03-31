function connectservice(_process){
    eventobj.call(this);

    this.process = _process;

    var that = this;
    this.connect = function(ip, port, cb_this_argv, cb){
        getLogger().trace("begin connect host:%s, port:%d", ip, port);

        var net = require('net');
        var sock = new net.Socket();
        sock.connect(port, ip, function(){
            getLogger().trace("connectting host:%s, port:%d", ip, port);

            var ch = new channel(sock);
            ch.add_event_listen("ondisconnect", that, that.on_channel_disconn);
    
            _process.reg_channel(ch);

            cb.call(cb_this_argv, ch);

            getLogger().trace("end connect host:%s, port:%d", ip, port);
        });
    }

    this.on_channel_disconn = function(ch){
        this.call_event("on_ch_disconn", [ch]);
        _process.unreg_channel(ch);
    }

}
