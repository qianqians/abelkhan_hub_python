function client(_uuid){
    event_closure.call(this);

    this.uuid = _uuid;
    this.modules = new modulemng();
    this.is_conn_gate = false;
    this.is_enable_heartbeats = false;
    this.tick = new Date().getTime();

    var _process = new process();
    var _module = new gate_call_clientmodule();
    _process.reg_module(_module);
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

    this.conn = new connectservice(_process);

    this.juggle_service = new juggleservice();
    this.juggle_service.add_process(_process);

    this.connect_server = function(url){
        this.ch = this.conn.connect(url);

        this.client_call_gate = new client_call_gatecaller(this.ch);
		this.client_call_gate.connect_server(this.uuid, new Date().getTime());
    }

    this.enable_heartbeats = function(){
        this.client_call_gate.enable_heartbeats();

        this.is_enable_heartbeats = true;
        this.heartbeats_time = new Date().getTime();
    }

    this.connect_hub = function(hub_name){
        this.client_call_gate.connect_hub(uuid, hub_name);
    }

    this.call_hub = function(hub_name, module_name, func_name, _argvs){
        this.client_call_gate.forward_client_call_hub(hub_name, module_name, func_name, _argvs);
    }

    this.heartbeats = function(){
        if (!is_conn_gate){
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

    this.poll = function(){
        this.heartbeats();
        this.juggle_service.poll();
    }
}
