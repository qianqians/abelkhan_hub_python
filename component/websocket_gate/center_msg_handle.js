function center_msg_handle(_centerproxy_, _close_handle){
    this._centerproxy = _centerproxy_;

    this.reg_server_sucess = function(){
        getLogger().trace("connect center sucess");
        
        this._centerproxy.is_reg_center_sucess = true;
    }

    this.close_server = function() {
        _close_handle.is_close = true;
    }

}
