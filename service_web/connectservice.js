function connectservice(_process){
    eventobj.call(this);

    this.process = _process;

    this.connect = function(url){
        var ws = new WebSocket(url);

        var ch = new channel(ws);
        ch.add_event_listen("ondisconnect", this, this.on_channel_disconn);

        this.process.reg_channel(ch);

        return ch;
    }

    this.on_channel_disconn = function(ch){
        this.call_event("on_ch_disconn", [ch]);
        this.process.unreg_channel(ch);
    }

}
