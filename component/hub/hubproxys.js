function hubproxy(hub_name, hub_ch){
    this.name = hub_name;
    this.caller = new hub_call_hub_caller(ch);

    this.reg_hub_sucess = function(){
        this.caller.reg_hub_sucess();
    }

    this.caller_hub = function(module_name, func_name, argvs){
        this.caller.hub_call_hub_mothed(module_name, func_name, argvs);
    }
}

function hubmng(){
    this.hubproxys = {};

    this.reg_hub = function(hub_name, ch){
        var _proxy = new hubproxy(hub_name, ch);
        this.hubproxys[hub_name] = _proxy;
        
        return _proxy;
    }

    this.call_hub = function(hub_name, module_name, func_name, argvs){
        if (this.hubproxys[hub_name]){
            this.hubproxys[hub_name].caller_hub(module_name, func_name, argvs);
        }
    }
}