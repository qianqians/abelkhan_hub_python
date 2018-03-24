function gate_msg_handle(_hub, _modulemng){
    this.hub = _hub;
    this.modulemng = _modulemng;

    this.reg_hub_sucess = function(){}

    this.client_connect = function(client_uuid){
        this.hub.gates.client_connect(client_uuid, current_ch);
    }

    this.client_disconnect = function(client_uuid){
        this.hub.gates.client_disconnect(client_uuid);
    }

    this.client_exception = function(client_uuid){
        this.hub.gates.client_exception(client_uuid);
    }

    this.client_call_hub = function(uuid, _module, func, argv){
		this.hub.gates.current_client_uuid = uuid;
        this.hub.modules.process_module_mothed(_module, func, argv);
		this.hub.gates.current_client_uuid = "";
    }
}