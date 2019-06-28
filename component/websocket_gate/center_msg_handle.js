function center_msg_handle(_gate_, _centerproxy_){
    this.gate = _gate_;
    this._centerproxy = _centerproxy_;

    this.reg_server_sucess = function(){
        getLogger().trace("connect center sucess");
        
        this._centerproxy.is_reg_center_sucess = true;
    }

    this.close_server = function() {
        this.hub.onCloseServer_event();
    }

}
