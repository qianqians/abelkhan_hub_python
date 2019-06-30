function clientproxy(_ch){
    this.ch = _ch;
    this.caller = new gate_call_client_caller(_ch);
    this.client_time = Date.now();
    this.server_time = Date.now();
    this.conn_hubs = [];

    this.ntf_uuid = function(uuid){
        this.caller.ntf_uuid(uuid);
    }

    this.connect_gate_sucess = function(){
        this.caller.connect_gate_sucess()
    }

    this.connect_hub_sucess = function(hub_name){
        this.caller.connect_hub_sucess(hub_name);
    }

    this.ack_heartbeats = function(){
        this.caller.ack_heartbeats();
    }

    this.call_client = function(module_name, func_name, argvs){
        this.caller.call_client(module_name, func_name, argvs);
    }
}

function clientmanager(hubmng) {
    this.heartbeats_client = [];
    this.client_map = new Map();
    this.client_uuid_map = new Map();
    
    this.hubs = hubmng;
    
    this.enable_heartbeats = (_ch) => {
        let _client = _ch.client;
        this.heartbeats_client.push(_client);
    }
    
    this.disable_heartbeats = (_ch) => {
        let _client = _ch.client;
        let index = this.heartbeats_client.indexOf(_client);
        if (index != -1){
            this.heartbeats_client.splice(index, 1)
        }
    }
    
    this.heartbeat_client = () => {
        let ticktime = Date.now();

        let remove_client = [];
        for (let client of this.client_uuid_map.keys()) {
            if ((client.server_time + 60 * 60 * 1000) < ticktime) {
                remove_client.push(client);
                continue;
            }
    
            if ((client.server_time + 20 * 1000) < ticktime) {
                if (this.heartbeats_client.indexOf(client) != -1) {
                    remove_client.push(client);
                }
            }
        }
        
        for (let _client of remove_client){
            let client_uuid = this.client_uuid_map.get(_client);
            for(let hubproxy of _client.conn_hubs){
                hubproxy.client_disconnect(client_uuid);
            }
        }
    
        for (let _client of remove_client) {
            let index = this.heartbeats_client.indexOf(_client);
            if (index != -1){
                this.heartbeats_client.splice(index, 1);
            }

            let client_uuid = this.client_uuid_map.get(_client);
            this.client_uuid_map.delete(_client);

            this.client_map.delete(client_uuid);
    
            _client.ch.disconnect();
        }
    }
    
    this.refresh_and_check_client = (_ch, servertick, clienttick) => {
        let _client = _ch.client;

        if (((clienttick - _client.client_time) - (servertick - _client.server_time)) > 10 * 1000) {
            let client_uuid = this.client_uuid_map.get(_client);
            for(let hubproxy of _client.conn_hubs){
                hubproxy.client_exception(client_uuid);
            }
        }
    
        _client.server_time = servertick;
        _client.client_time = clienttick;
    }
    
    this.reg_client = (client_uuid, _ch, servertick, clienttick) => {
        let _client = new clientproxy(_ch);
        _ch.client = _client;
        _client.client_time = clienttick;
        _client.server_time = servertick;

        this.client_map.set(client_uuid, _client);
        this.client_uuid_map.set(_client, client_uuid);

        return _client;
    }
    
    this.unreg_client = (_ch) => {
        let _client = _ch.client;

        if (!this.client_uuid_map.has(_client)){
            return;
        }
    
        let _client_uuid = this.client_uuid_map.get(_client);
        getLogger().trace("unreg_client:%s", _client_uuid);
    
        this.client_map.delete(_client_uuid);
        this.client_uuid_map.delete(_client);
        let index = this.heartbeats_client.indexOf(_client);
        if (index != -1) {
            this.heartbeats_client.splice(index);
        }

        for(let hubproxy of _client.conn_hubs){
            hubproxy.client_disconnect(client_uuid);
        }
    }
    
    this.has_client_handle = (_ch) => {
        let _client = _ch.client;
        return this.client_uuid_map.has(_client);
    }
    
    this.has_client_uuid = (client_uuid) => {
        return this.client_map.has(client_uuid);
    } 
    
    this.get_client_uuid = (_ch) => {
        let _client = _ch.client;
        return this.client_uuid_map.get(_client);
    }
    
    this.get_client_handle = (client_uuid) => {
        return this.client_map.get(client_uuid);
    }
    
    this.for_each_client = (fn) => {
        for (let client_uuid of this.client_map.keys()){
            fn(client_uuid, this.client_map.get(client_uuid));
        }
    }
}