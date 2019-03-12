function hubproxy(hub_name, hub_ch){
    this.name = hub_name;
    this.caller = new hub_call_hub_caller(hub_ch);

    this.reg_hub_sucess = function(){
        this.caller.reg_hub_sucess();
    }

    this.call_hub = function(module_name, func_name, argvs){
        this.caller.hub_call_hub_mothed(module_name, func_name, argvs);
    }
}

function hubmng(hub){
    this.hubproxys = {};

    this.reg_hub = function(hub_name, ch){
        var _proxy = new hubproxy(hub_name, ch);
        this.hubproxys[hub_name] = _proxy;

        hub.call_event("hub_connect", [hub_name]);

        return _proxy;
    }

    this.call_hub = function(hub_name, module_name, func_name){
        if (this.hubproxys[hub_name]){
            this.hubproxys[hub_name].call_hub(module_name, func_name, [].slice.call(arguments, 3));
        }
    }
}
