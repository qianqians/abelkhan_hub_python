function modulemng(){
    this.module_set = {};
    
    this.add_module = function(_module_name, _module){
		this.module_set[_module_name] = _module;
    }
    
    this.process_module_mothed = function(_module_name, _func_name, _argvs){
        this.module_set[_module_name][_func_name].apply(this.module_set[_module_name], _argvs);
    }
}
