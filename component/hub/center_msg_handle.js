function center_msg_handle(_hub_, _centerproxy_){
    this.hub = _hub_;
    this._centerproxy = _centerproxy_;

    this.reg_server_sucess = function(){
        getLogger().trace("connect center sucess");
        this._centerproxy.is_reg_center_sucess = true;
        this.hub.onConnectCenter_event();
    }

    this.close_server = function() {
        this.hub.onCloseServer_event();
    }

    this.distribute_server_address = function( type,  ip,  port,  uuid ){
		if (type == "gate") {
			this.hub.gates.connect_gate(uuid, ip, port);
		}
        if (type == "hub"){
            this.hub.reg_hub(ip, port);
        }
        if (type == "dbproxy"){
            this.hub.try_connect_db(ip, port);
        }
	}

}
