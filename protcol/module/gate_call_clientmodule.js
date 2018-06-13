/*this module file is codegen by juggle for js*/
function gate_call_client_module(){
    eventobj.call(this);
    Imodule.call(this, "gate_call_client");

    this.connect_server_sucess = function(){
        this.call_event("connect_server_sucess", []);
    }

    this.ack_heartbeats = function(){
        this.call_event("ack_heartbeats", []);
    }

    this.call_client = function(argv0, argv1, argv2){
        this.call_event("call_client", [argv0, argv1, argv2]);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Imodule.prototype;
    gate_call_client_module.prototype = new Super();
})();
gate_call_client_module.prototype.constructor = gate_call_client_module;

