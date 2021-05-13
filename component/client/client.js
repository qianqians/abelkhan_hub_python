function client(){
    event_closure.call(this);

    //this.uuid = _uuid;
    this.modules = new modulemng();
    this.is_conn_gate = false;
    this.is_enable_heartbeats = false;
    this.tick = new Date().getTime();

    this._process = new juggle_process();
    var _module = new gate_call_client_module();
    this._process.reg_module(_module);
    _module.add_event_listen("ntf_uuid", this, function(uuid){
        this.uuid = uuid;
        this.client_call_gate.connect_server(this.uuid, new Date().getTime());
    });
    _module.add_event_listen("connect_gate_sucess", this, function(){
        this.is_conn_gate = true;
        this.heartbeats_time = new Date().getTime();
        this.client_call_gate.heartbeats(new Date().getTime());

        this.call_event("on_connect_gate", []);
    });
    _module.add_event_listen("connect_hub_sucess", this, function(hub_name){
        this.call_event("on_connect_hub", [hub_name]);
    });
    _module.add_event_listen("ack_heartbeats", this, function(){
        this.heartbeats_time = new Date().getTime();
    });
    _module.add_event_listen("call_client", this, function(module_name, func_name, argvs){
        this.modules.process_module_mothed(module_name, func_name, argvs);
    });

    this.conn = new connectservice(this._process);

    this._hub_process = new juggle_process();
    var _hub_module = new hub_call_client_module();
    this._hub_process.reg_module(_hub_module);
    _hub_module.add_event_listen("call_client", this, function(module_name, func_name, argvs){
        this.modules.process_module_mothed(module_name, func_name, argvs);
    });

    this.hub_conn = new connectservice(this._hub_process);

    this.juggle_service = new juggleservice();
    this.juggle_service.add_process(this._process);
    this.juggle_service.add_process(this._hub_process);
    var juggle_service = this.juggle_service;

    this.direct_ch = {};
    this.direct_connect_hub = (hub_name, url, conn_sucess_cb)=>{
        let ch = this.hub_conn.connect(url);
        ch.add_event_listen("onopen", this, function(){
            let client_call_hub = new client_call_hub_caller(ch);
            this.direct_ch[hub_name] = client_call_hub;
            client_call_hub.client_connect(this.uuid);
            conn_sucess_cb();
            //this.client_call_gate.connect_server(this.uuid, new Date().getTime());
        });
        return ch;
    }

    this.connect_server = function(url, conn_sucess_cb){
        this.ch = this.conn.connect(url);
        this.ch.add_event_listen("onopen", this, function(){
            this.client_call_gate = new client_call_gate_caller(this.ch);
            //this.client_call_gate.connect_server(this.uuid, new Date().getTime());
            conn_sucess_cb();
        });
        return this.ch;
    }

    this.connect_hub = function(hub_name){
        this.client_call_gate.connect_hub(hub_name);
    }

    this.enable_heartbeats = function(){
        this.client_call_gate.enable_heartbeats();

        this.is_enable_heartbeats = true;
        this.heartbeats_time = new Date().getTime();
    }

    this.call_hub = function(hub_name, module_name, func_name){
        if (this.direct_ch[hub_name]){
            this.direct_ch[hub_name].call_hub(this.uuid, module_name, func_name, [].slice.call(arguments, 3));
            return;
        }

        this.client_call_gate.forward_client_call_hub(hub_name, module_name, func_name, [].slice.call(arguments, 3));
    }

    this.heartbeats = function(){
        if (!this.is_conn_gate){
            return;
        }

        let tick = new Date().getTime();
        if ( this.is_enable_heartbeats && (this.heartbeats_time < (tick - 10 * 1000)) ){
            this.ch.call_event("ondisconnect", []);
            return;
        }

        this.client_call_gate.heartbeats(now);
    }

    var that = this;
    this.poll = function(){
        that.heartbeats();
        juggle_service.poll();
    }
}
module.exports.client = client;