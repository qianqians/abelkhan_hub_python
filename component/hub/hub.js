function hub(argvs){
    event_closure.call(this);

    const uuidv1 = require('uuid/v1');
    this.uuid = uuidv1();

    var cfg = config(argvs[0]);
    this.center_cfg = cfg["center"];
    if (argvs.length > 1){
        this.cfg = cfg[argvs[1]];
    }
    
    configLogger(this.cfg["log_dir"] + '\\' + this.cfg["log_file"], this.cfg["log_level"]);
    getLogger().trace("config logger!");

    this.name = this.cfg["hub_name"];

    this.modules = new modulemng();
    this.close_handle = new closehandle();
    this.hubs = new hubmng();

    var _hub_msg_handle = new hub_msg_handle(this.modules, this.hubs);
    var hub_call_hub = new hub_call_hub_module();
    hub_call_hub.add_event_listen("reg_hub", _hub_msg_handle, _hub_msg_handle.reg_hub);
    hub_call_hub.add_event_listen("reg_hub_sucess", _hub_msg_handle, _hub_msg_handle.reg_hub_sucess);
    hub_call_hub.add_event_listen("hub_call_hub_mothed", _hub_msg_handle, _hub_msg_handle.hub_call_hub_mothed);
    this.hub_process = new process();
    this.hub_process.reg_module(hub_call_hub);
    this.accept_hub_service = new acceptservice(this.cfg["ip"], this.cfg["port"], this.hub_process);
    this.connect_hub_service = new connectservice(this.hub_process);

    this.center_process = new process();
    this.connect_center_service = new connectservice(this.center_process);
    this.connect_center_service.connect(this.center_cfg["ip"], this.center_cfg["port"], this, function(center_ch){
        getLogger().trace("begin on connect center");

        this.centerproxy = new centerproxy(center_ch);

        var center_call_hub = new center_call_hub_module();
        var center_call_server = new center_call_server_module();
        var _center_msg_handle = new center_msg_handle(this, this.centerproxy);
        center_call_server.add_event_listen("reg_server_sucess", _center_msg_handle, _center_msg_handle.reg_server_sucess);
		center_call_server.add_event_listen("close_server", _center_msg_handle, _center_msg_handle.close_server);
		center_call_hub.add_event_listen("distribute_server_address", _center_msg_handle, _center_msg_handle.distribute_server_address);
        center_call_hub.add_event_listen("reload", this, this.onReload_event);
        this.center_process.reg_module(center_call_hub);
        this.center_process.reg_module(center_call_server);

        this.centerproxy.reg_hub(this.cfg["ip"], this.cfg["port"], this.uuid);

        getLogger().trace("end on connect center");
    });

    var dbproxy_call_hub = new dbproxy_call_hub_module();
    var _dbproxy_msg_handle = new dbproxy_msg_handle(this);
    dbproxy_call_hub.add_event_listen("reg_hub_sucess", _dbproxy_msg_handle, _dbproxy_msg_handle.reg_hub_sucess);
	dbproxy_call_hub.add_event_listen("ack_create_persisted_object", _dbproxy_msg_handle, _dbproxy_msg_handle.ack_create_persisted_object);
	dbproxy_call_hub.add_event_listen("ack_updata_persisted_object", _dbproxy_msg_handle, _dbproxy_msg_handle.ack_updata_persisted_object);
    dbproxy_call_hub.add_event_listen("ack_get_object_count", _dbproxy_msg_handle, _dbproxy_msg_handle.ack_get_object_count);
    dbproxy_call_hub.add_event_listen("ack_get_object_info", _dbproxy_msg_handle, _dbproxy_msg_handle.ack_get_object_info);
	dbproxy_call_hub.add_event_listen("ack_get_object_info_end", _dbproxy_msg_handle, _dbproxy_msg_handle.ack_get_object_info_end);
    dbproxy_call_hub.add_event_listen("ack_remove_object", _dbproxy_msg_handle, _dbproxy_msg_handle.ack_remove_object);
    this.dbproxy_process = new process();
    this.dbproxy_process.reg_module(dbproxy_call_hub);
    this.connect_dbproxy_service = new connectservice(this.dbproxy_process);

    var gate_call_hub = new gate_call_hub_module();
    var _gate_msg_handle = new gate_msg_handle(this, this.modules);
    gate_call_hub.add_event_listen("reg_hub_sucess", _gate_msg_handle, _gate_msg_handle.reg_hub_sucess);
    gate_call_hub.add_event_listen("client_connect", _gate_msg_handle, _gate_msg_handle.client_connect);
    gate_call_hub.add_event_listen("client_disconnect", _gate_msg_handle, _gate_msg_handle.client_disconnect);
    gate_call_hub.add_event_listen("client_exception", _gate_msg_handle, _gate_msg_handle.client_exception);
    gate_call_hub.add_event_listen("client_call_hub", _gate_msg_handle, _gate_msg_handle.client_call_hub);
    this.gate_process = new process();
    this.gate_process.reg_module (gate_call_hub);
    this.connect_gate_servcie = new connectservice(this.gate_process);
    this.gates = new gatemng(this.connect_gate_servcie, this);

    this.juggle_service = new juggleservice();
    this.juggle_service.add_process(this.hub_process);
	this.juggle_service.add_process(this.center_process);
	this.juggle_service.add_process(this.dbproxy_process);
    this.juggle_service.add_process (this.gate_process);
    
    var juggle_service = this.juggle_service;
    var that = this;
    this.poll = function(){
        try { 
            juggle_service.poll();
        }
        catch(err) {
            getLogger().error(err);
        }

        setImmediate(that.poll);
    }

    this.onConnectDB_event = function(){
        this.call_event("on_connect_db", []);
    }

    this.onCloseServer_event = function(){
        this.call_event("on_close", []);
        this.close_handle.is_close = true;
    }

    this.onReload_event = function(argv){
        this.call_event("on_reload", [argv]);
    }

    var that = this;
    this.connect_dbproxy = function(db_ip, db_port){
		this.connect_dbproxy_service.connect(db_ip, db_port, this, function(db_ch){
			this.dbproxy = new dbproxyproxy(db_ch);
			this.dbproxy.reg_hub(that.uuid);
        });
	}

    this.reg_hub = function(hub_ip, hub_port){
        this.connect_hub_service.connect(hub_ip, hub_port, this, function(ch){
            var caller = new hub_call_hub_caller(ch);
            caller.reg_hub(that.name);
        });
    }
}
module.exports.hub = hub;
