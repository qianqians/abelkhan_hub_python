function client(_uuid){
    event_closure.call(this);

    this.uuid = _uuid;
    this.modules = new modulemng();
    this.is_conn_gate = false;
    this.is_enable_heartbeats = false;
    this.tick = new Date().getTime();

    this._process = new juggle_process();
    var _module = new gate_call_client_module();
    this._process.reg_module(_module);
    _module.add_event_listen("connect_server_sucess", this, function(){
        this.is_conn_gate = true;
        this.heartbeats_time = new Date().getTime();
        this.client_call_gate.heartbeats(new Date().getTime());

        this.call_event("on_connect_server", []);
    });
    _module.add_event_listen("ack_heartbeats", this, function(){
        this.heartbeats_time = new Date().getTime();
    });
    _module.add_event_listen("call_client", this, function(module_name, func_name, argvs){
        this.modules.process_module_mothed(module_name, func_name, argvs);
    });

    this.conn = new connectservice(this._process);

    this.juggle_service = new juggleservice();
    this.juggle_service.add_process(this._process);
    var juggle_service = this.juggle_service;

    this.connect_server = function(url){
        this.ch = this.conn.connect(url);
        this.ch.add_event_listen("onopen", this, function(){
            this.client_call_gate = new client_call_gate_caller(this.ch);
            this.client_call_gate.connect_server(this.uuid, new Date().getTime());
        });
    }

    this.enable_heartbeats = function(){
        this.client_call_gate.enable_heartbeats();

        this.is_enable_heartbeats = true;
        this.heartbeats_time = new Date().getTime();
    }

    this.call_hub = function(hub_name, module_name, func_name){
        this.client_call_gate.forward_client_call_hub(hub_name, module_name, func_name, [].slice.call(arguments, 3));
    }

    this.heartbeats = function(){
        if (!this.is_conn_gate){
            return;
        }

        var now = new Date().getTime();
        if ( (now - this.tick) > 5 * 1000 ){
            if ( this.is_enable_heartbeats && (this.heartbeats_time < (this.tick - 20 * 1000)) ){
                this.call_event("on_disconnect", []);
                return;
            }

            this.client_call_gate.heartbeats(now);
        }
        this.tick = now;
    }

    var that = this;
    this.poll = function(){
        that.heartbeats();
        juggle_service.poll();
    }
}
