function hubproxy(_hub_name, _ch){
    this.hub_name = _hub_name;
    this.ch = _ch;
    this.caller = new gate_call_hub_caller(_ch);

    this.reg_hub_sucess = function(){
        this.caller.reg_hub_sucess();
    }

    this.client_connect = function(client_uuid){
        this.caller.client_connect(client_uuid);
    }

    this.client_disconnect = function(client_uuid){
        this.caller.client_disconnect(client_uuid);
    }

    this.client_exception = function(client_uuid){
        this.caller.client_exception(client_uuid);
    }

    this.client_call_hub = function(client_uuid, _module, func, argvs){
        this.caller.client_call_hub(client_uuid, _module, func, argvs);
    }
}

function hubmanager() {
    this.hubs_name = new Map();

    this.reg_hub = (hub_name, ch) => {
        let hub_proxy = new hubproxy(hub_name, ch);
        ch.hub_proxy = hub_proxy;

        this.hubs_name.set(hub_name, hub_proxy);

        return hub_proxy;
    }
    
    this.get_hub_by_name = (hub_name) => {
        if (!this.hubs_name.has(hub_name)){
            return null;
        }
        return this.hubs_name.get(hub_name);
    }
    
    this.get_hub_name = (hub_channel) => {
        return hub_channel.hub_proxy.hub_name;
    }
    
    this.for_each_hub = (fn) => {
        for (let hub_name of this.hubs_name.keys()) {
            fn(hub_name, this.hubs_name.get(hub_name));
        }
    }
}