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
function channel(_sock){
    eventobj.call(this);

    this.events = [];
    
    this.data = null;

    this.sock = _sock;
    var ch = this;
    _sock.on('data', function(data){
        try
        {
            getLogger().trace("begin on data");
            
            var new_data = data;
            if (ch.data !== null){
                new_data = Buffer.concat([ch.data, new_data]);
            }

            while(new_data.length > 4){
                var len = new_data[0] | new_data[1] << 8 | new_data[2] << 16 | new_data[3] << 24;

                if ( (len + 4) > new_data.length ){
                    break;
                }

                var json_str = new_data.toString('utf-8', 4, (len + 4));
                var end = 0;
                for(var i = 0; json_str[i] != '\0' & i < json_str.length; i++){
                    end++;
                }
                json_str = json_str.substring(0, end);
                getLogger().trace(json_str);
                ch.events.push(JSON.parse(json_str));
                
                if ( new_data.length > (len + 4) ){
                    new_data = new_data.slice(len + 4);
                }
                else{
                    new_data = null;
                    break;
                }
            }

            ch.data = new_data;

            getLogger().trace("end on data");
        }
        catch(err)
        {
            getLogger().error(err);
        }
    });
    _sock.on('close', function(){
        ch.call_event("ondisconnect", [ch]);
    });
    _sock.on('error', function(error){
        ch.call_event("ondisconnect", [ch]);
    });
    
    this.push = function(event){
        var json_str = JSON.stringify(event);

        var send_data = Buffer.alloc(4 + json_str.length);
        send_data.writeUInt8(json_str.length & 0xff, 0);
        send_data.writeUInt8((json_str.length >> 8) & 0xff, 1);
        send_data.writeUInt8((json_str.length >> 16) & 0xff, 2);
        send_data.writeUInt8((json_str.length >> 24) & 0xff, 3);
        send_data.write(json_str, 4, 4+json_str.length, 'utf-8');

        _sock.write(send_data);

        getLogger().trace(json_str);
    }    
    
    this.pop = function(){
        if (this.events.length === 0){
            return null;
        }

        return this.events.shift();
    }
}
function acceptservice(ip, port, _process){
    eventobj.call(this);
    this.process = _process;

    var net = require('net');
    var that = this;
    this.server = net.createServer(function(s){
        var ch = new channel(s);
        ch.add_event_listen('ondisconnect', that, function(ch){
            _process.unreg_channel(ch);
            that.call_event("on_channel_disconnect", [ch]);
        });

        _process.reg_channel(ch);
        that.call_event("on_channel_connect", [ch]);
    }).listen(port, ip);

}
function connectservice(_process){
    eventobj.call(this);

    this.process = _process;

    var that = this;
    this.connect = function(ip, port, cb_this_argv, cb){
        getLogger().trace("begin connect host:%s, port:%d", ip, port);

        var net = require('net');
        var sock = new net.Socket();
        sock.connect(port, ip, function(){
            getLogger().trace("connectting host:%s, port:%d", ip, port);

            var ch = new channel(sock);
            ch.add_event_listen("ondisconnect", that, that.on_channel_disconn);
    
            _process.reg_channel(ch);

            cb.call(cb_this_argv, ch);

            getLogger().trace("end connect host:%s, port:%d", ip, port);
        });
    }

    this.on_channel_disconn = function(ch){
        this.call_event("on_ch_disconn", [ch]);
        _process.unreg_channel(ch);
    }

}
function juggleservice(){
    this.process_set = [];
    
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
function center_caller(ch){
    Icaller.call(this, "center", ch);

    this.reg_server = function( argv0, argv1, argv2, argv3){
        var _argv = [argv0,argv1,argv2,argv3];
        this.call_module_method.call(this, "reg_server", _argv);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Icaller.prototype;
    center_caller.prototype = new Super();
})();
center_caller.prototype.constructor = center_caller;

/*this caller file is codegen by juggle for js*/
function hub_call_center_caller(ch){
    Icaller.call(this, "hub_call_center", ch);

    this.closed = function(){
        var _argv = [];
        this.call_module_method.call(this, "closed", _argv);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Icaller.prototype;
    hub_call_center_caller.prototype = new Super();
})();
hub_call_center_caller.prototype.constructor = hub_call_center_caller;

/*this caller file is codegen by juggle for js*/
function hub_call_dbproxy_caller(ch){
    Icaller.call(this, "hub_call_dbproxy", ch);

    this.reg_hub = function( argv0){
        var _argv = [argv0];
        this.call_module_method.call(this, "reg_hub", _argv);
    }

    this.create_persisted_object = function( argv0, argv1, argv2, argv3){
        var _argv = [argv0,argv1,argv2,argv3];
        this.call_module_method.call(this, "create_persisted_object", _argv);
    }

    this.updata_persisted_object = function( argv0, argv1, argv2, argv3, argv4){
        var _argv = [argv0,argv1,argv2,argv3,argv4];
        this.call_module_method.call(this, "updata_persisted_object", _argv);
    }

    this.get_object_count = function( argv0, argv1, argv2, argv3){
        var _argv = [argv0,argv1,argv2,argv3];
        this.call_module_method.call(this, "get_object_count", _argv);
    }

    this.get_object_info = function( argv0, argv1, argv2, argv3){
        var _argv = [argv0,argv1,argv2,argv3];
        this.call_module_method.call(this, "get_object_info", _argv);
    }

    this.remove_object = function( argv0, argv1, argv2, argv3){
        var _argv = [argv0,argv1,argv2,argv3];
        this.call_module_method.call(this, "remove_object", _argv);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Icaller.prototype;
    hub_call_dbproxy_caller.prototype = new Super();
})();
hub_call_dbproxy_caller.prototype.constructor = hub_call_dbproxy_caller;

/*this caller file is codegen by juggle for js*/
function hub_call_gate_caller(ch){
    Icaller.call(this, "hub_call_gate", ch);

    this.reg_hub = function( argv0, argv1){
        var _argv = [argv0,argv1];
        this.call_module_method.call(this, "reg_hub", _argv);
    }

    this.connect_sucess = function( argv0){
        var _argv = [argv0];
        this.call_module_method.call(this, "connect_sucess", _argv);
    }

    this.disconnect_client = function( argv0){
        var _argv = [argv0];
        this.call_module_method.call(this, "disconnect_client", _argv);
    }

    this.forward_hub_call_client = function( argv0, argv1, argv2, argv3){
        var _argv = [argv0,argv1,argv2,argv3];
        this.call_module_method.call(this, "forward_hub_call_client", _argv);
    }

    this.forward_hub_call_group_client = function( argv0, argv1, argv2, argv3){
        var _argv = [argv0,argv1,argv2,argv3];
        this.call_module_method.call(this, "forward_hub_call_group_client", _argv);
    }

    this.forward_hub_call_global_client = function( argv0, argv1, argv2){
        var _argv = [argv0,argv1,argv2];
        this.call_module_method.call(this, "forward_hub_call_global_client", _argv);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Icaller.prototype;
    hub_call_gate_caller.prototype = new Super();
})();
hub_call_gate_caller.prototype.constructor = hub_call_gate_caller;

/*this caller file is codegen by juggle for js*/
function hub_call_hub_caller(ch){
    Icaller.call(this, "hub_call_hub", ch);

    this.reg_hub = function( argv0){
        var _argv = [argv0];
        this.call_module_method.call(this, "reg_hub", _argv);
    }

    this.reg_hub_sucess = function(){
        var _argv = [];
        this.call_module_method.call(this, "reg_hub_sucess", _argv);
    }

    this.hub_call_hub_mothed = function( argv0, argv1, argv2){
        var _argv = [argv0,argv1,argv2];
        this.call_module_method.call(this, "hub_call_hub_mothed", _argv);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Icaller.prototype;
    hub_call_hub_caller.prototype = new Super();
})();
hub_call_hub_caller.prototype.constructor = hub_call_hub_caller;

/*this module file is codegen by juggle for js*/
function center_call_hub_module(){
    eventobj.call(this);
    Imodule.call(this, "center_call_hub");

    this.distribute_server_address = function(argv0, argv1, argv2, argv3){
        this.call_event("distribute_server_address", [argv0, argv1, argv2, argv3]);
    }

    this.reload = function(argv0){
        this.call_event("reload", [argv0]);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Imodule.prototype;
    center_call_hub_module.prototype = new Super();
})();
center_call_hub_module.prototype.constructor = center_call_hub_module;

/*this module file is codegen by juggle for js*/
function center_call_server_module(){
    eventobj.call(this);
    Imodule.call(this, "center_call_server");

    this.reg_server_sucess = function(){
        this.call_event("reg_server_sucess", []);
    }

    this.close_server = function(){
        this.call_event("close_server", []);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Imodule.prototype;
    center_call_server_module.prototype = new Super();
})();
center_call_server_module.prototype.constructor = center_call_server_module;

/*this module file is codegen by juggle for js*/
function dbproxy_call_hub_module(){
    eventobj.call(this);
    Imodule.call(this, "dbproxy_call_hub");

    this.reg_hub_sucess = function(){
        this.call_event("reg_hub_sucess", []);
    }

    this.ack_create_persisted_object = function(argv0){
        this.call_event("ack_create_persisted_object", [argv0]);
    }

    this.ack_updata_persisted_object = function(argv0){
        this.call_event("ack_updata_persisted_object", [argv0]);
    }

    this.ack_get_object_count = function(argv0, argv1){
        this.call_event("ack_get_object_count", [argv0, argv1]);
    }

    this.ack_get_object_info = function(argv0, argv1){
        this.call_event("ack_get_object_info", [argv0, argv1]);
    }

    this.ack_get_object_info_end = function(argv0){
        this.call_event("ack_get_object_info_end", [argv0]);
    }

    this.ack_remove_object = function(argv0){
        this.call_event("ack_remove_object", [argv0]);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Imodule.prototype;
    dbproxy_call_hub_module.prototype = new Super();
})();
dbproxy_call_hub_module.prototype.constructor = dbproxy_call_hub_module;

/*this module file is codegen by juggle for js*/
function gate_call_hub_module(){
    eventobj.call(this);
    Imodule.call(this, "gate_call_hub");

    this.reg_hub_sucess = function(){
        this.call_event("reg_hub_sucess", []);
    }

    this.client_connect = function(argv0){
        this.call_event("client_connect", [argv0]);
    }

    this.client_disconnect = function(argv0){
        this.call_event("client_disconnect", [argv0]);
    }

    this.client_exception = function(argv0){
        this.call_event("client_exception", [argv0]);
    }

    this.client_call_hub = function(argv0, argv1, argv2, argv3){
        this.call_event("client_call_hub", [argv0, argv1, argv2, argv3]);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Imodule.prototype;
    gate_call_hub_module.prototype = new Super();
})();
gate_call_hub_module.prototype.constructor = gate_call_hub_module;

/*this module file is codegen by juggle for js*/
function hub_call_hub_module(){
    eventobj.call(this);
    Imodule.call(this, "hub_call_hub");

    this.reg_hub = function(argv0){
        this.call_event("reg_hub", [argv0]);
    }

    this.reg_hub_sucess = function(){
        this.call_event("reg_hub_sucess", []);
    }

    this.hub_call_hub_mothed = function(argv0, argv1, argv2){
        this.call_event("hub_call_hub_mothed", [argv0, argv1, argv2]);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Imodule.prototype;
    hub_call_hub_module.prototype = new Super();
})();
hub_call_hub_module.prototype.constructor = hub_call_hub_module;

function modulemng(){
    this.module_set = {};
    
    this.add_module = function(_module_name, _module){
		this.module_set[_module_name] = _module;
    }
    
    this.process_module_mothed = function(_module_name, _func_name, _argvs){
        this.module_set[_module_name][_func_name].apply(this.module_set[_module_name], _argvs);
    }
}
function config(cfgfilepath){
    var fs = require('fs');
    var data = fs.readFileSync(cfgfilepath, 'utf8');
    var obj = JSON.parse(data.toString());
    return obj;
}
module.exports.config = config;function configLogger(logfilepath, _level){
    var log4js = require('log4js');
    log4js.configure({
        appenders: {
            normal: {
                type: 'file',
                filename: logfilepath, 
                maxLogSize: 1024*32,
                backups: 3,
            }
        },
        categories: {default: { appenders: ['normal'], level: _level }}
    });
}

function getLogger(){
    var log4js = require('log4js');
    return log4js.getLogger('normal');
}function center_msg_handle(_hub_, _centerproxy_){
    this.hub = _hub_;
    this._centerproxy = _centerproxy_;

    this.reg_server_sucess = function(){
        getLogger().trace("connect center sucess");
        this._centerproxy.is_reg_center_sucess = true;
    }

    this.close_server = function() {
        this.hub.onCloseServer_event();
    }
    
    this.distribute_server_address = function( type,  ip,  port,  uuid ){
		if (type == "dbproxy") {
			this.hub.connect_dbproxy (ip, port);
		}
		if (type == "gate") {
			this.hub.gates.connect_gate(uuid, ip, port);
		}
        if (type == "hub"){
            this.hub.reg_hub(ip, port);
        }
	}

}
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
function closehandle(){
    this.is_close = false;
}
function dbproxy_msg_handle(_hub){
    this.hub = _hub;

    this.reg_hub_sucess = function(){
        getLogger().trace("connect db sucess");
        this.hub.onConnectDB_event();
    }
    
    this.ack_create_persisted_object = function( callbackid ){
		var cb = this.hub.dbproxy.begin_callback(callbackid);
		cb();
		this.hub.dbproxy.end_callback(callbackid);
	}

	this.ack_updata_persisted_objec = function( callbackid ){
        var cb = this.hub.dbproxy.begin_callback(callbackid);
		cb();
        this.hub.dbproxy.end_callback(callbackid);
	}

    this.ack_get_object_count = function( callbackid,  count ){
        var cb = this.hub.dbproxy.begin_callback(callbackid);
        cb.call(null, count);
    }

	this.ack_get_object_info = function( callbackid, json_obejct_array ){
		var cb = this.hub.dbproxy.begin_callback(callbackid);
		cb.call(null, json_obejct_array);
	}

	this.ack_get_object_info_end = function( callbackid ){
        var cb = this.hub.dbproxy.end_get_object_info_callback(callbackid);
        cb();
    }

    this.ack_remove_object = function( callbackid ){
        var cb = this.hub.dbproxy.begin_callback(callbackid);
        cb();
    }
}
function dbproxyproxy(ch){
    this.hub_call_dbproxy = new hub_call_dbproxy_caller(ch);
    this.callback_set = {};
    this.end_cb_set = {};

    this.reg_hub = function(uuid){
		this.hub_call_dbproxy.reg_hub(uuid);
	}

    this.getCollection = function( db,  collection ){
        return new Collection(db, collection, this);
    }

    function Collection(db, collection, proxy){
        this.db = db;
        this.collection = collection;
        this.dbproxy = proxy;

        this.createPersistedObject = function( object_info, cb ){
            var UUID = require('uuid');
            var callbackid = UUID.v1();
            this.dbproxy.hub_call_dbproxy.create_persisted_object(this.db, this.collection, object_info, callbackid);
            this.dbproxy.callback_set[callbackid] = cb;
        }

        this.updataPersistedObject = function( query_json,  updata_info,  cb ){
            var UUID = require('uuid');
            var callbackid = UUID.v1();
            this.dbproxy.hub_call_dbproxy.updata_persisted_object(this.db, this.collection, query_json, updata_info, callbackid);
            this.dbproxy.callback_set[callbackid] = cb;
        }

        this.getObjectCount = function( query_json, cb ){
            var UUID = require('uuid');
            var callbackid = UUID.v1();
            this.dbproxy.hub_call_dbproxy.get_object_count(this.db, this.collection, query_json, callbackid);
            this.dbproxy.callback_set[callbackid] = cb;
        }

        this.getObjectInfo = function( query_json, cb, end ){
            var UUID = require('uuid');
            var callbackid = UUID.v1();
            this.dbproxy.hub_call_dbproxy.get_object_info(this.db, this.collection, query_json, callbackid);
            this.dbproxy.callback_set[callbackid] = cb;
            this.dbproxy.end_cb_set[callbackid] = end;
        }

        this.removeObject = function( query_json, cb ){
            var UUID = require('uuid');
            var callbackid = UUID.v1();
            this.dbproxy.hub_call_dbproxy.remove_object(this.db, this.collection, query_json, callbackid);
            this.dbproxy.callback_set[callbackid] = cb;
        }
    }

    this.begin_callback = function(callbackid){
		if (this.callback_set[callbackid]){
			return this.callback_set[callbackid];
		}

		return null;
	}

	this.end_callback = function(callbackid){
		if (this.callback_set[callbackid])
		{
			delete this.callback_set[callbackid];
		}
	}

    this.end_get_object_info_callback = function(callbackid){
        this.end_callback(callbackid);

        if (this.end_cb_set[callbackid]){
            var cb = this.end_cb_set[callbackid];
            delete this.end_cb_set[callbackid];
            return cb;
        }

        return null;
    }



}
function gate_msg_handle(_hub, _modulemng){
    this.hub = _hub;
    this.modulemng = _modulemng;

    this.reg_hub_sucess = function(){
        getLogger().trace("connect gate sucess");
    }

    this.client_connect = function(client_uuid){
        getLogger().trace("client connect:%s", client_uuid);
        this.hub.gates.client_connect(client_uuid, current_ch);
    }

    this.client_disconnect = function(client_uuid){
        this.hub.gates.client_disconnect(client_uuid);
    }

    this.client_exception = function(client_uuid){
        this.hub.gates.client_exception(client_uuid);
    }

    this.client_call_hub = function(uuid, _module, func, argv){
		this.hub.gates.current_client_uuid = uuid;
        this.hub.modules.process_module_mothed(_module, func, argv);
		this.hub.gates.current_client_uuid = "";
    }
}
function gateproxy(ch, hub){
    this.caller = new hub_call_gate_caller(ch);
    this.hub = hub;

    this.reg_hub = function(){
        this.caller.reg_hub(this.hub.uuid, this.hub.name);
	}

    this.connect_sucess = function(client_uuid){
        this.caller.connect_sucess(client_uuid);
    }

    this.disconnect_client = function(uuid){
        this.caller.disconnect_client(uuid);
    }

    this.forward_hub_call_client = function(uuid, module, func, argv){
        this.caller.forward_hub_call_client(uuid, module, func, argv);
    }

    this.forward_hub_call_group_client = function(uuids, module, func, argv){
		this.caller.forward_hub_call_group_client(uuids, module, func, argv);
	}

	this.forward_hub_call_global_client = function(module, func, argv){
		this.caller.forward_hub_call_global_client(module, func, argv);
	}
}

function gatemng(conn, hub){
    eventobj.call(this);
    this.conn = conn;
    this.hub = hub;

    this.current_client_uuid = ""
    this.clients = {};

	this.gates = {};

    this.connect_gate = function(uuid, ip, port){
		this.conn.connect(ip, port, this, function(ch){
            this.gates[uuid] = new gateproxy(ch, hub);
            ch.gateproxy = this.gates[uuid];
            this.gates[uuid].reg_hub();
        });
	}

    this.client_connect = function(client_uuid, gate_ch){
        if (!gate_ch.gateproxy){
            return;
        }

        if (this.clients[client_uuid]){
            return;
        }

        getLogger().trace("reg client:%s", client_uuid);

        this.clients[client_uuid] = gate_ch.gateproxy;
        gate_ch.gateproxy.connect_sucess(client_uuid);

        hub.call_event("client_connect", [client_uuid]);
    }

    this.client_disconnect = function(client_uuid){
        if (this.clients[client_uuid]){
            hub.call_event("client_disconnect", [client_uuid]);

            delete this.clients[client_uuid];
        }
    }

    this.client_exception = function(client_uuid){
        hub.call_event("client_exception", [client_uuid]);
    }

    this.disconnect_client = function(uuid){
        if (this.clients[uuid]){
            this.clients[uuid].disconnect_client(uuid);
            delete this.clients[uuid];
        }
    }

    this.call_client = function(uuid, _module, func){
		if (this.clients[uuid]){
            this.clients[uuid].forward_hub_call_client(uuid, _module, func, [].slice.call(arguments, 3));
        }
    }

    this.call_group_client = function(uuids, _module, func){
        var argvs = [].slice.call(arguments, 3)
		for(let uuid in this.gates){
			this.gates[uuid].forward_hub_call_group_client(uuids, _module, func, argvs);
		}
	}

	this.call_global_client = function(_module, func){
        var argvs = [].slice.call(arguments, 2)
		for(let uuid in this.gates){
			this.gates[uuid].forward_hub_call_global_client(_module, func, argvs);
		}
	}

}
function hub_msg_handle(modules, hubs){
    this.modules = modules;
    this.hubs = hubs;

    this.reg_hub = function(hub_name){
        var _proxy = this.hubs.reg_hub(hub_name, current_ch);
        _proxy.reg_hub_sucess();
    }

    this.reg_hub_sucess = function(){
        getLogger().trace("connect hub sucess");
    }

    this.hub_call_hub_mothed = function(module_name, func_name, argvs){
        this.modules.process_module_mothed(module_name, func_name, argvs);
    }
}
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

function hubmng(){
    this.hubproxys = {};

    this.reg_hub = function(hub_name, ch){
        var _proxy = new hubproxy(hub_name, ch);
        this.hubproxys[hub_name] = _proxy;
        
        return _proxy;
    }

    this.call_hub = function(hub_name, module_name, func_name){
        if (this.hubproxys[hub_name]){
            this.hubproxys[hub_name].call_hub(module_name, func_name, [].slice.call(arguments, 3));
        }
    }
}
function hub(argvs){
    event_closure.call(this);

    const uuidv1 = require('uuid/v1');
    this.uuid = uuidv1();

    var cfg = config(argvs[0]);
    this.center_cfg = cfg["center"];
    if (argvs.length > 1){
        this.cfg = cfg[argvs[1]];
    }

    configLogger(this.cfg["log_dir"] + '\\' + this.cfg["log_file"], this.cfg["log_level"]);
    getLogger().trace("config logger!");

    this.name = this.cfg["hub_name"];

    this.modules = new modulemng();
    this.close_handle = new closehandle();
    this.hubs = new hubmng();

    var _hub_msg_handle = new hub_msg_handle(this.modules, this.hubs);
    var hub_call_hub = new hub_call_hub_module();
    hub_call_hub.add_event_listen("reg_hub", _hub_msg_handle, _hub_msg_handle.reg_hub);
    hub_call_hub.add_event_listen("reg_hub_sucess", _hub_msg_handle, _hub_msg_handle.reg_hub_sucess);
    hub_call_hub.add_event_listen("hub_call_hub_mothed", _hub_msg_handle, _hub_msg_handle.hub_call_hub_mothed);
    this.hub_process = new juggle_process();
    this.hub_process.reg_module(hub_call_hub);
    this.accept_hub_service = new acceptservice(this.cfg["ip"], this.cfg["port"], this.hub_process);
    this.connect_hub_service = new connectservice(this.hub_process);

    this.center_process = new juggle_process();
    this.connect_center_service = new connectservice(this.center_process);
    this.connect_center_service.connect(this.center_cfg["ip"], this.center_cfg["port"], this, function(center_ch){
        getLogger().trace("begin on connect center");

        this.centerproxy = new centerproxy(center_ch);

        var center_call_hub = new center_call_hub_module();
        var center_call_server = new center_call_server_module();
        var _center_msg_handle = new center_msg_handle(this, this.centerproxy);
        center_call_server.add_event_listen("reg_server_sucess", _center_msg_handle, _center_msg_handle.reg_server_sucess);
		center_call_server.add_event_listen("close_server", _center_msg_handle, _center_msg_handle.close_server);
		center_call_hub.add_event_listen("distribute_server_address", _center_msg_handle, _center_msg_handle.distribute_server_address);
        center_call_hub.add_event_listen("reload", this, this.onReload_event);
        this.center_process.reg_module(center_call_hub);
        this.center_process.reg_module(center_call_server);

        this.centerproxy.reg_hub(this.cfg["ip"], this.cfg["port"], this.uuid);

        getLogger().trace("end on connect center");
    });

    var dbproxy_call_hub = new dbproxy_call_hub_module();
    var _dbproxy_msg_handle = new dbproxy_msg_handle(this);
    dbproxy_call_hub.add_event_listen("reg_hub_sucess", _dbproxy_msg_handle, _dbproxy_msg_handle.reg_hub_sucess);
	dbproxy_call_hub.add_event_listen("ack_create_persisted_object", _dbproxy_msg_handle, _dbproxy_msg_handle.ack_create_persisted_object);
	dbproxy_call_hub.add_event_listen("ack_updata_persisted_object", _dbproxy_msg_handle, _dbproxy_msg_handle.ack_updata_persisted_object);
    dbproxy_call_hub.add_event_listen("ack_get_object_count", _dbproxy_msg_handle, _dbproxy_msg_handle.ack_get_object_count);
    dbproxy_call_hub.add_event_listen("ack_get_object_info", _dbproxy_msg_handle, _dbproxy_msg_handle.ack_get_object_info);
	dbproxy_call_hub.add_event_listen("ack_get_object_info_end", _dbproxy_msg_handle, _dbproxy_msg_handle.ack_get_object_info_end);
    dbproxy_call_hub.add_event_listen("ack_remove_object", _dbproxy_msg_handle, _dbproxy_msg_handle.ack_remove_object);
    this.dbproxy_process = new juggle_process();
    this.dbproxy_process.reg_module(dbproxy_call_hub);
    this.connect_dbproxy_service = new connectservice(this.dbproxy_process);

    var gate_call_hub = new gate_call_hub_module();
    var _gate_msg_handle = new gate_msg_handle(this, this.modules);
    gate_call_hub.add_event_listen("reg_hub_sucess", _gate_msg_handle, _gate_msg_handle.reg_hub_sucess);
    gate_call_hub.add_event_listen("client_connect", _gate_msg_handle, _gate_msg_handle.client_connect);
    gate_call_hub.add_event_listen("client_disconnect", _gate_msg_handle, _gate_msg_handle.client_disconnect);
    gate_call_hub.add_event_listen("client_exception", _gate_msg_handle, _gate_msg_handle.client_exception);
    gate_call_hub.add_event_listen("client_call_hub", _gate_msg_handle, _gate_msg_handle.client_call_hub);
    this.gate_process = new juggle_process();
    this.gate_process.reg_module (gate_call_hub);
    this.connect_gate_servcie = new connectservice(this.gate_process);
    this.gates = new gatemng(this.connect_gate_servcie, this);

    this.juggle_service = new juggleservice();
    this.juggle_service.add_process(this.hub_process);
	this.juggle_service.add_process(this.center_process);
	this.juggle_service.add_process(this.dbproxy_process);
    this.juggle_service.add_process (this.gate_process);

    var juggle_service = this.juggle_service;
    var that = this;
    this.poll = function(){
        try {
            juggle_service.poll();
        }
        catch(err) {
            getLogger().error(err);
        }

        if (!that.close_handle.is_close){
            setImmediate(that.poll);
        }else{
            process.exit();
        }

    }

    this.onConnectDB_event = function(){
        this.call_event("on_connect_db", []);
    }

    this.onCloseServer_event = function(){
        this.call_event("on_close", []);
        this.centerproxy.closed();
        this.close_handle.is_close = true;
    }

    this.onReload_event = function(argv){
        this.call_event("on_reload", [argv]);
    }

    var that = this;
    this.connect_dbproxy = function(db_ip, db_port){
		this.connect_dbproxy_service.connect(db_ip, db_port, this, function(db_ch){
			this.dbproxy = new dbproxyproxy(db_ch);
			this.dbproxy.reg_hub(that.uuid);
        });
	}

    this.reg_hub = function(hub_ip, hub_port){
        this.connect_hub_service.connect(hub_ip, hub_port, this, function(ch){
            var caller = new hub_call_hub_caller(ch);
            caller.reg_hub(that.name);
        });
    }
}
module.exports.hub = hub;
module.exports.event_cb = event_closure;
