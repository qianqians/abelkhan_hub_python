function hub_msg_handle(modules, hubs){
    this.modules = modules;
    this.hubs = hubs;

    this.reg_hub = function(hub_name){
        var _proxy = this.hubs.reg_hub(hub_name, current_ch);
        _proxy.reg_hub_sucess();
    }

    this.reg_hub_sucess = function(){}

    this.hub_call_hub_mothed = function(module_name, func_name, argvs){
        this.modules.process_module_mothed(module_name, func_name, argvs);
    }
}