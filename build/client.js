function eventobj(){
    this.events = {}

    this.add_event_listen = function(event, this_argv, mothed){
        this.events[event] = {"this_argv":this_argv, "mothed":mothed};
    }

    this.call_event = function(event, argvs){
        if (this.events[event] && this.events[event]["mothed"]){
            this.events[event]["mothed"].apply(this.events[event]["this_argv"], argvs);
        }
    }
}
function Icaller(_module_name, _ch){
    this.module_name = _module_name;
    this.ch = _ch;
    this.call_module_method = function(method_name, argvs){
        var _event = new Array(this.module_name, method_name, argvs);
        this.ch.push(_event); 
    }
}
var current_ch = null;

function Imodule(module_name){
    this.module_name = module_name;
    this.process_event = function(_ch, _event){
        current_ch = _ch;

        var func_name = _event[1];
        this[func_name].apply(this, _event[2]);

        current_ch = null;
    }
}
function juggle_process(){
    this.module_set = {};

    this.event_set = new Array();
    this.add_event = new Array();
    this.remove_event = new Array();

    this.reg_channel = function(ch){
        this.add_event.push(ch);
    }

    this.unreg_channel = function(ch){
        this.remove_event.push(ch);
    }

    this.reg_module = function(_module){
		this.module_set[_module.module_name] = _module;
    }

    this.poll = function(){
        for(ch in this.add_event)
        {
            this.event_set.push(this.add_event[ch]);
        }
        this.add_event = new Array();

        var _new_event_set = new Array();
        for(_ch in this.event_set)
        {
            var in_remove_event = false;
            for(ch in this.remove_event)
            {
                if (this.event_set[_ch] === this.remove_event[ch])
                {
                    in_remove_event = true;
                    break;
                }
            }
            if (!in_remove_event)
            {
                _new_event_set.push(this.event_set[_ch]);
            }
        }
        this.event_set = _new_event_set;
        this.remove_event = new Array();

        for(ch in this.event_set)
        {
			while (true)
			{
                var _event = this.event_set[ch].pop();
                if (_event === null)
                {
                    break;
                }
                this.module_set[_event[0]].process_event(this.event_set[ch], _event);
            }
        }
    }
}
function event_closure(){
    this.events = {}

    this.add_event_listen = function(event, mothed){
        this.events[event] = mothed;
    }

    this.call_event = function(event, argvs){
        if (this.events[event]){
            this.events[event].apply(null, argvs);
        }
    }
}
function channel(_ws){
    eventobj.call(this);

    this.events = [];
    
    this.offset = 0;
    this.data = null;

    this.ws = _ws;
    this.ws.ch = this;
    this.ws.binaryType = "arraybuffer";
    this.ws.onmessage = function(evt){
        var u8data = new Uint8Array(evt.data);
        
        var new_data = new Uint8Array(this.ch.offset + u8data.byteLength);
        if (this.ch.data !== null){
            new_data.set(this.ch.data);
        }
        new_data.set(u8data, this.ch.offset);

        while(new_data.length > 4){
            var len = new_data[0] | new_data[1] << 8 | new_data[2] << 16 | new_data[3] << 24;

            if ( (len + 4) > new_data.length ){
                break;
            }

            var json_str = new TextDecoder('utf-8').decode( new_data.subarray( 4, (len + 4) ) );
            var end = 0;
            for(var i = 0; json_str[i] != '\0' & i < json_str.length; i++){
                end++;
            }
            json_str = json_str.substring(0, end);
            this.ch.events.push(JSON.parse(json_str));
            
            if ( new_data.length > (len + 4) ){
                new_data = new_data.subarray(len + 4);
            }
            else{
                new_data = null;
                break;
            }
        }

        this.ch.data = new_data;
        if (new_data !== null){
            this.ch.offset = new_data.length;
        }else{
            this.ch.offset = 0;
        }
    }
    this.ws.onopen = function(){
        this.ch.call_event("onopen", [this.ch]);
    }
    this.ws.onclose = function(){
        this.ch.call_event("ondisconnect", [this.ch]);
    }
    this.ws.onerror = function(){
        this.ch.call_event("ondisconnect", [this.ch]);
    }
    
    this.push = function(event){
        var json_str = JSON.stringify(event);
        var u8data = new TextEncoder('utf-8').encode(json_str);

        var send_data = new Uint8Array(4 + u8data.length);
        send_data[0] = u8data.length & 0xff;
        send_data[1] = (u8data.length >> 8) & 0xff;
        send_data[2] = (u8data.length >> 16) & 0xff;
        send_data[3] = (u8data.length >> 24) & 0xff;
        send_data.set(u8data, 4);

        this.ws.send(send_data.buffer);
    }

    this.pop = function(){
        if (this.events.length === 0){
            return null;
        }

        return this.events.shift();
    }
}
function connectservice(_process){
    eventobj.call(this);

    this.process = _process;

    this.connect = function(url){
        var ws = new WebSocket(url);

        var ch = new channel(ws);
        ch.add_event_listen("ondisconnect", this, this.on_channel_disconn);

        this.process.reg_channel(ch);

        return ch;
    }

    this.on_channel_disconn = function(ch){
        this.call_event("on_ch_disconn", [ch]);
        this.process.unreg_channel(ch);
    }

}
function juggleservice(){
    this.process_set = new Array();
    
    this.add_process = function(_process){
		this.process_set.push(_process);
    }
    
    this.poll = function(){
        for(var p in this.process_set){
            this.process_set[p].poll();
        }
    }
}
/*this caller file is codegen by juggle for js*/
function client_call_gate_caller(ch){
    Icaller.call(this, "client_call_gate", ch);

    this.connect_server = function( argv0, argv1){
        var _argv = [argv0,argv1];
        this.call_module_method.call(this, "connect_server", _argv);
    }

    this.cancle_server = function(){
        var _argv = [];
        this.call_module_method.call(this, "cancle_server", _argv);
    }

    this.enable_heartbeats = function(){
        var _argv = [];
        this.call_module_method.call(this, "enable_heartbeats", _argv);
    }

    this.disable_heartbeats = function(){
        var _argv = [];
        this.call_module_method.call(this, "disable_heartbeats", _argv);
    }

    this.connect_hub = function( argv0, argv1){
        var _argv = [argv0,argv1];
        this.call_module_method.call(this, "connect_hub", _argv);
    }

    this.disconnect_hub = function( argv0, argv1){
        var _argv = [argv0,argv1];
        this.call_module_method.call(this, "disconnect_hub", _argv);
    }

    this.forward_client_call_hub = function( argv0, argv1, argv2, argv3){
        var _argv = [argv0,argv1,argv2,argv3];
        this.call_module_method.call(this, "forward_client_call_hub", _argv);
    }

    this.heartbeats = function( argv0){
        var _argv = [argv0];
        this.call_module_method.call(this, "heartbeats", _argv);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Icaller.prototype;
    client_call_gate_caller.prototype = new Super();
})();
client_call_gate_caller.prototype.constructor = client_call_gate_caller;

/*this module file is codegen by juggle for js*/
function gate_call_client_module(){
    eventobj.call(this);
    Imodule.call(this, "gate_call_client");

    this.connect_gate_sucess = function(){
        this.call_event("connect_gate_sucess", []);
    }

    this.connect_hub_sucess = function(argv0){
        this.call_event("connect_hub_sucess", [argv0]);
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

function modulemng(){
    this.module_set = {};
    
    this.add_module = function(_module_name, _module){
		this.module_set[_module_name] = _module;
    }
    
    this.process_module_mothed = function(_module_name, _func_name, _argvs){
        this.module_set[_module_name][_func_name].apply(this.module_set[_module_name], _argvs);
    }
}
function client(_uuid){
    event_closure.call(this);

    this.uuid = _uuid;
    this.modules = new modulemng();
    this.is_conn_gate = false;
    this.is_enable_heartbeats = false;
    this.tick = new Date().getTime();

    this._process = new juggle_process();
    var _module = new gate_call_client_module();
    this._process.reg_module(_module);
    _module.add_event_listen("connect_gate_sucess", this, function(){
        this.is_conn_gate = true;
        this.heartbeats_time = new Date().getTime();
        this.client_call_gate.heartbeats(new Date().getTime());

        this.call_event("on_connect_gate", []);
    });
    _module.add_event_listen("connect_hub_sucess", this, function(hub_name){
        this.call_event("on_connect_hub", [hub_name]);
    });
    _module.add_event_listen("ack_heartbeats", this, function(){
        this.heartbeats_time = new Date().getTime();
    });
    _module.add_event_listen("call_client", this, function(module_name, func_name, argvs){
        this.modules.process_module_mothed(module_name, func_name, argvs);
    });

    this.conn = new connectservice(this._process);

    this.juggle_service = new juggleservice();
    this.juggle_service.add_process(this._process);
    var juggle_service = this.juggle_service;

    this.connect_server = function(url){
        this.ch = this.conn.connect(url);
        this.ch.add_event_listen("onopen", this, function(){
            this.client_call_gate = new client_call_gate_caller(this.ch);
            this.client_call_gate.connect_server(this.uuid, new Date().getTime());
        });
    }

    this.enable_heartbeats = function(){
        this.client_call_gate.enable_heartbeats();

        this.is_enable_heartbeats = true;
        this.heartbeats_time = new Date().getTime();
    }

    this.connect_hub = function(hub_name){
        this.client_call_gate.connect_hub(this.uuid, hub_name);
    }

    this.call_hub = function(hub_name, module_name, func_name){
        this.client_call_gate.forward_client_call_hub(hub_name, module_name, func_name, [].slice.call(arguments, 3));
    }

    this.heartbeats = function(){
        if (!this.is_conn_gate){
            return;
        }

        var now = new Date().getTime();
        if ( (now - this.tick) > 5 * 1000 ){
            if ( this.is_enable_heartbeats && (this.heartbeats_time < (this.tick - 20 * 1000)) ){
                this.call_event("on_disconnect", []);
                return;
            }

            this.client_call_gate.heartbeats(now);
        }
        this.tick = now;
    }

    var that = this;
    this.poll = function(){
        that.heartbeats();
        juggle_service.poll();
    }
}
