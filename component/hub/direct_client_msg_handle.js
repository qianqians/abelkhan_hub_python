function direct_client_msg_handle(modules, hub){
    this.modules = modules;
    this.hub = hub;

    this.client_connect = function(uuid){
        this.hub.gates.client_direct_connect(uuid, current_ch);
    }

    this.call_hub = function(uuid, _module, func, argv){
        this.hub.gates.current_client_uuid = uuid;
        this.hub.modules.process_module_mothed(_module, func, argv);
		this.hub.gates.current_client_uuid = "";
    }
}
