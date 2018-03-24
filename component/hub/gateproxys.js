function gateproxy(ch, hub){
    this.caller = new hub_call_gate_caller(ch);
    this.hub = hub;

    this.reg_hub = function(){
        this.caller.reg_hub(this.hub.uuid, this.hub.name);
	}

    this.connect_sucess = function(client_uuid){
        this.caller.connect_sucess(client_uuid);
    }

    this.disconnect_client = function(uuid){
        this.caller.disconnect_client(uuid);
    }

    this.forward_hub_call_client = function(uuid, module, func, argv){
        this.caller.forward_hub_call_client(uuid, module, func, argv);
    }

    this.forward_hub_call_group_client = function(uuids, module, func, argv){
		this.caller.forward_hub_call_group_client(uuids, module, func, argv);
	}

	this.forward_hub_call_global_client = function(module, func, argv){
		this.caller.forward_hub_call_global_client(module, func, argv);
	}
}

function gatemng(conn){
    eventobj.call(this);
    this.conn = conn;

    this.current_client_uuid = ""
    this.clients = {};

	this.gates = {};

    this.connect_gate = function(uuid, ip, port){
		this.conn.connect(ip, port, this, function(ch){
            this.gates[uuid] = new gateproxy(ch);
            ch.gateproxy = this.gates[uuid];
            this.gates[uuid].reg_hub();
        });
	}

    this.client_connect = function(client_uuid, gate_ch){
        if (!gate_ch.gateproxy){
            return;
        }

        if (this.clients[client_uuid]){
            return;
        }

        this.clients[client_uuid] = gate_ch.gateproxy;
        gate_ch.gateproxy.connect_sucess(client_uuid);

        this.call_event("client_connect", [client_uuid]);
    }

    this.client_disconnect = function(client_uuid){
        if (this.clients[client_uuid]){
            this.call_event("client_disconnect", [client_uuid]);

            delete this.clients[client_uuid];
        }
    }

    this.client_exception = function(client_uuid){
        this.call_event("client_exception", [client_uuid]);
    }

    this.disconnect_client = function(uuid){
        if (this.clients[uuid]){
            this.clients[uuid].disconnect_client(uuid);
            delete this.clients[uuid];
        }
    }

    this.call_client = function(uuid, _module, func, argvs){
		if (this.clients[uuid]){
            this.clients[uuid].forward_hub_call_client(uuid, _module, func, argvs);
        }  
    }

    this.call_group_client = function(uuids, _module, func, argvs){
		for(let uuid in this.gates){
			this.gates[uuid].forward_hub_call_group_client(uuids, _module, func, argvs);
		}
	}

	this.call_global_client = function(_module, func, argvs){
		for(let uuid in this.gates){
			this.gates[uuid].forward_hub_call_global_client(_module, func, _argvs_list);
		}
	}

}