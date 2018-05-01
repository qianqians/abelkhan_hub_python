function centerproxy(ch){
    this.is_reg_center_sucess = false;
    this.center = new center_caller(ch);
    this.hub_call_center = new hub_call_center_caller(ch);

    this.reg_hub = function( ip,  port,  uuid ){
        this.center.reg_server("hub", ip, port, uuid);
	}

    this.closed = function(){
        this.hub_call_center.closed();
    }
}
