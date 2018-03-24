function centerproxy(ch){
    this.is_reg_center_sucess = false;
    this.hub_call_center = new center_caller(ch);
    
    this.reg_hub = function( ip,  port,  uuid ){
        this.hub_call_center.reg_server("hub", ip, port, uuid);
	}
}
