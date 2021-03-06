function eventobj(){
    this.events = {}

    this.add_event_listen = function(event, this_argv, mothed){
        if (!this.events[event]){
            this.events[event] = [];
        }
        this.events[event].push({"this_argv":this_argv, "mothed":mothed});
    }

    this.call_event = function(event, argvs){
        if (!this.events[event]){
            return;
        }

        for(var _event of this.events[event]){
            if (!_event["mothed"]){
                continue;
            }
            
            _event["mothed"].apply(_event["this_argv"], argvs);
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
        for(let ch in this.add_event)
        {
            this.event_set.push(this.add_event[ch]);
        }
        this.add_event = new Array();

        var _new_event_set = new Array();
        for(let _ch in this.event_set)
        {
            var in_remove_event = false;
            for(let ch in this.remove_event)
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

        for(let ch in this.event_set)
        {
			while (true)
			{
                var _event = this.event_set[ch].pop();
                if (!_event)
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
        var json_buff = Buffer.from(json_str, 'utf-8');

        var send_header = Buffer.alloc(4);
        send_header.writeUInt8(json_buff.length & 0xff, 0);
        send_header.writeUInt8((json_buff.length >> 8) & 0xff, 1);
        send_header.writeUInt8((json_buff.length >> 16) & 0xff, 2);
        send_header.writeUInt8((json_buff.length >> 24) & 0xff, 3);
        var send_data = Buffer.concat([send_header, json_buff]);

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
/* jshint esversion: 6 */
const enet = require('./js_enet');

function enetchannel(host, _rhost, _rport){
    eventobj.call(this);

    this.events = [];

    this.host = host;
    this.rhost = _rhost;
    this.rport = _rport;

    this.on_recv = (msg)=>{
        getLogger().trace("on_recv begin");

        let len = msg[0] | msg[1] << 8 | msg[2] << 16 | msg[3] << 24;

        do{
            if ( (len + 4) > msg.length){
                getLogger().trace("on_recv wrong msg.len");
                break;
            }

            var json_str = msg.toString('utf-8', 4, (len + 4));
            getLogger().trace("on_recv", json_str);
            this.events.push(JSON.parse(json_str));
            
        }while(0);

        getLogger().trace("on_recv end");
    };

    this.push = function(event){
        var json_str = JSON.stringify(event);
        var json_buff = Buffer.from(json_str, 'utf-8');

        var send_header = Buffer.alloc(4);
        send_header.writeUInt8((json_buff.length) & 0xff, 0);
        send_header.writeUInt8((json_buff.length >> 8) & 0xff, 1);
        send_header.writeUInt8((json_buff.length >> 16) & 0xff, 2);
        send_header.writeUInt8((json_buff.length >> 24) & 0xff, 3);
        var send_data = Buffer.concat([send_header, json_buff]);

        enet.enet_peer_send(host, _rhost, _rport, send_data);

        getLogger().trace("push", json_str);
    };

    this.pop = function(){
        if (this.events.length === 0){
            return null;
        }

        return this.events.shift();
    };
}
module.exports.enetchannel = enetchannel;/* jshint esversion: 6 */

function ipToInt(ip){
    var result = ip.split(",");
    if(!result) return -1;
    return (parseInt(result[0]) << 24 
        | parseInt(result[1]) << 16
        | parseInt(result[2]) << 8
        | parseInt(result[3]))>>>0;
}

function enetconnectservice(_process){
    eventobj.call(this);

    this.process = _process;
    this.host = enet.enet_client_create(2048);
    getLogger().trace("enetconnectservice host handle:%d", this.host);

    this.poll = ()=>{
        let event = enet.enet_host_service(this.host);
        if (event){
            switch(event.type)
            {
            case 1:
                {
                    let raddr = event.ip + ":" + event.port;
                    getLogger().trace("enetconnectservice poll raddr:%s", raddr);
                    let ch = new enetchannel(this.host, event.host, event.port);
                    this.conns[raddr] = ch;
                    _process.reg_channel(ch);

                    let cb = this.conn_cbs[raddr];
                    if (cb){
                        delete this.conn_cbs[raddr];
                        cb(ch);
                    }
                }
                break;
            case 3:
                {
                    this.onRecv(event.data, event.ip, event.port);
                }
                break;
            }
        }
    }

    this.onRecv = (msg, rhost, rport)=>{
        getLogger().trace("message begin");

        if(msg.length >= 4){
            let raddr = rhost + ":" + rport;
            let ch = this.conns[raddr];
            if (!ch){
                getLogger().trace("message invalid ch end");
                return;
            }

            ch.on_recv(msg);
        }

        getLogger().trace("message end");
    }

    this.connect = (rhost, rport, cb) =>{
        let raddr = rhost + ":" + rport;
        this.conn_cbs[raddr] = cb;

        getLogger().trace("enetconnectservice connect raddr:%s", raddr);

        enet.enet_host_connect(this.host, rhost, rport);
    };
    this.conn_cbs = {};
    this.conns = {};
}
module.exports.enetconnectservice = enetconnectservice;/* jshint esversion: 6 */
function enetservice(ip, port, _process){
    eventobj.call(this);

    this.process = _process;
    this.host = enet.enet_host_create(ip, port, 2048);
    getLogger().trace("enetservice host handle:%d", this.host);

    this.poll = ()=>{
        let event = enet.enet_host_service(this.host);
        if (event){
            switch(event.type)
            {
            case 1:
                {
                    let raddr = event.ip + ":" + event.port;
                    getLogger().trace("enetservice poll raddr:%s", raddr);
                    let ch = this.conns[raddr];
                    if (!ch){
                        ch = new enetchannel(this.host, event.host, event.port);
                        this.conns[raddr] = ch;
                        _process.reg_channel(ch);
                    }

                    let cb = this.conn_cbs[raddr];
                    if (cb){
                        delete this.conn_cbs[raddr];
                        cb(ch);
                    }
                    else{
                        this.call_event("on_channel_connect", [ch]);
                    }
                }
                break;
            case 3:
                {
                    this.onRecv(event.data, event.ip, event.port);
                }
                break;
            }
        }
    }

    this.onRecv = (msg, rhost, rport)=>{
        getLogger().trace("message begin");

        if(msg.length >= 4){
            let raddr = rhost + ":" + rport;
            let ch = this.conns[raddr];
            if (!ch){
                getLogger().trace("message invalid ch end");
                return;
            }

            ch.on_recv(msg);
        }

        getLogger().trace("message end");
    }
    
    this.connect = (rhost, rport, cb) =>{
        let raddr = rhost + ":" + rport;
        this.conn_cbs[raddr] = cb;

        getLogger().trace("enetservice connect raddr:%s", raddr);

        enet.enet_host_connect(this.host, rhost, rport);
    };
    this.conn_cbs = {};
    this.conns = {};
}
module.exports.enetservice = enetservice;function websocketacceptservice(host, port, is_ssl, certificate, private_key, _process){
    eventobj.call(this);
    var that = this;
    var WebSocket = require('ws');

    if (is_ssl){
        var https = require('https');
        var fs = require('fs');
        var keypath = private_key;
        var certpath = certificate;
        var options = {
            key: fs.readFileSync(keypath),
            cert: fs.readFileSync(certpath)
        };
        var server=https.createServer(options, function (req, res) {
            res.writeHead(403);
            res.end("This is a  WebSockets server!\n");
        }).listen(port);
    
        var webServer = new WebSocket.Server({server:server});
        this.process = _process;
        webServer.on('connection', function connection(ws) {
            var ch = new websocketchannel(ws);
            ch.add_event_listen('ondisconnect', that, function(ch){
                _process.unreg_channel(ch);
                that.call_event("on_channel_disconnect", [ch]);
            });
            _process.reg_channel(ch);
            that.call_event("on_channel_connect", [ch]);
        });
    }
    else{
        var webServer = new WebSocket.Server({port:port});
        this.process = _process;
        webServer.on('connection', function connection(ws) {
            var ch = new websocketchannel(ws);
            ch.add_event_listen('ondisconnect', that, function(ch){
                _process.unreg_channel(ch);
                that.call_event("on_channel_disconnect", [ch]);
            });
            _process.reg_channel(ch);
            that.call_event("on_channel_connect", [ch]);
        });
    }
    
}
function websocketchannel(_sock){
    eventobj.call(this);

    this.events = [];

    this.data = null;

    this.sock = _sock;
    var ch = this;
    this.sock.binaryType = "Arraybuffer";
    _sock.on('message', function(data){
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
                getLogger().trace(json_str+"--------get");
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
        var json_buff = Buffer.from(json_str, 'utf-8');

        var send_header = Buffer.alloc(4);
        send_header.writeUInt8(json_buff.length & 0xff, 0);
        send_header.writeUInt8((json_buff.length >> 8) & 0xff, 1);
        send_header.writeUInt8((json_buff.length >> 16) & 0xff, 2);
        send_header.writeUInt8((json_buff.length >> 24) & 0xff, 3);
        var send_data = Buffer.concat([send_header, json_buff]);

       // _sock.write(send_data);
       _sock.send(send_data);
        getLogger().trace(json_str+"--------send");
    }

    this.pop = function(){
        if (this.events.length === 0){
            return null;
        }

        return this.events.shift();
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

/*this caller file is codegen by juggle for js*/
function gate_call_client_caller(ch){
    Icaller.call(this, "gate_call_client", ch);

    this.ntf_uuid = function( argv0){
        var _argv = [argv0];
        this.call_module_method.call(this, "ntf_uuid", _argv);
    }

    this.connect_gate_sucess = function(){
        var _argv = [];
        this.call_module_method.call(this, "connect_gate_sucess", _argv);
    }

    this.connect_hub_sucess = function( argv0){
        var _argv = [argv0];
        this.call_module_method.call(this, "connect_hub_sucess", _argv);
    }

    this.ack_heartbeats = function(){
        var _argv = [];
        this.call_module_method.call(this, "ack_heartbeats", _argv);
    }

    this.call_client = function( argv0, argv1, argv2){
        var _argv = [argv0,argv1,argv2];
        this.call_module_method.call(this, "call_client", _argv);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Icaller.prototype;
    gate_call_client_caller.prototype = new Super();
})();
gate_call_client_caller.prototype.constructor = gate_call_client_caller;

/*this module file is codegen by juggle for js*/
function client_call_gate_module(){
    eventobj.call(this);
    Imodule.call(this, "client_call_gate");

    this.connect_server = function(argv0, argv1){
        this.call_event("connect_server", [argv0, argv1]);
    }

    this.cancle_server = function(){
        this.call_event("cancle_server", []);
    }

    this.connect_hub = function(argv0){
        this.call_event("connect_hub", [argv0]);
    }

    this.enable_heartbeats = function(){
        this.call_event("enable_heartbeats", []);
    }

    this.disable_heartbeats = function(){
        this.call_event("disable_heartbeats", []);
    }

    this.forward_client_call_hub = function(argv0, argv1, argv2, argv3){
        this.call_event("forward_client_call_hub", [argv0, argv1, argv2, argv3]);
    }

    this.heartbeats = function(argv0){
        this.call_event("heartbeats", [argv0]);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Imodule.prototype;
    client_call_gate_module.prototype = new Super();
})();
client_call_gate_module.prototype.constructor = client_call_gate_module;

/*this caller file is codegen by juggle for js*/
function gate_call_hub_caller(ch){
    Icaller.call(this, "gate_call_hub", ch);

    this.reg_hub_sucess = function(){
        var _argv = [];
        this.call_module_method.call(this, "reg_hub_sucess", _argv);
    }

    this.client_connect = function( argv0){
        var _argv = [argv0];
        this.call_module_method.call(this, "client_connect", _argv);
    }

    this.client_disconnect = function( argv0){
        var _argv = [argv0];
        this.call_module_method.call(this, "client_disconnect", _argv);
    }

    this.client_exception = function( argv0){
        var _argv = [argv0];
        this.call_module_method.call(this, "client_exception", _argv);
    }

    this.client_call_hub = function( argv0, argv1, argv2, argv3){
        var _argv = [argv0,argv1,argv2,argv3];
        this.call_module_method.call(this, "client_call_hub", _argv);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Icaller.prototype;
    gate_call_hub_caller.prototype = new Super();
})();
gate_call_hub_caller.prototype.constructor = gate_call_hub_caller;

/*this module file is codegen by juggle for js*/
function hub_call_gate_module(){
    eventobj.call(this);
    Imodule.call(this, "hub_call_gate");

    this.reg_hub = function(argv0, argv1){
        this.call_event("reg_hub", [argv0, argv1]);
    }

    this.connect_sucess = function(argv0){
        this.call_event("connect_sucess", [argv0]);
    }

    this.disconnect_client = function(argv0){
        this.call_event("disconnect_client", [argv0]);
    }

    this.forward_hub_call_client = function(argv0, argv1, argv2, argv3){
        this.call_event("forward_hub_call_client", [argv0, argv1, argv2, argv3]);
    }

    this.forward_hub_call_group_client = function(argv0, argv1, argv2, argv3){
        this.call_event("forward_hub_call_group_client", [argv0, argv1, argv2, argv3]);
    }

    this.forward_hub_call_global_client = function(argv0, argv1, argv2){
        this.call_event("forward_hub_call_global_client", [argv0, argv1, argv2]);
    }

}
(function(){
    var Super = function(){};
    Super.prototype = Imodule.prototype;
    hub_call_gate_module.prototype = new Super();
})();
hub_call_gate_module.prototype.constructor = hub_call_gate_module;

function config(cfgfilepath){
    var fs = require('fs');
    var data = fs.readFileSync(cfgfilepath, 'utf8');
    var obj = JSON.parse(data.toString());
    return obj;
}
module.exports.config = config;var log4js = require('log4js');
function configLogger(logfilepath, _level){
    log4js.configure({
        appenders: {
            normal: {
                type: 'file',
                filename: logfilepath,
                maxLogSize: 1024*1024*32,
                backups: 3,
                layout: {
                    type: 'pattern',
                    pattern: '%d %p %m%n',
                }
            }
        },
        categories: {default: { appenders: ['normal'], level: _level }}
    });
}

function getLogger(){
    return log4js.getLogger('normal');
}
module.exports.getLogger = getLogger;function center_msg_handle(_centerproxy_, _close_handle){
    this._centerproxy = _centerproxy_;

    this.reg_server_sucess = function(){
        getLogger().trace("connect center sucess");
        
        this._centerproxy.is_reg_center_sucess = true;
    }

    this.close_server = function() {
        _close_handle.is_close = true;
    }

}
function centerproxy(ch){
    this.is_reg_center_sucess = false;
    this.center = new center_caller(ch);

    this.reg_server = function( ip,  port,  uuid ){
        this.center.reg_server("gate", ip, port, uuid);
	}
}
function client_msg_handle(clients, hubs){

    this.connect_server = (client_uuid, clienttick) => {
        if (clients.has_client_uuid(client_uuid)){
            return;
        }

        getLogger().trace("client connect:%s", client_uuid);

        let _cli_proxy = clients.reg_client(client_uuid, current_ch, Date.now(), clienttick);
        _cli_proxy.connect_gate_sucess();
    }

    this.cancle_server = () => {
        clients.unreg_client(current_ch);
    }

    this.connect_hub = (hub_name) => {
        if (!clients.has_client_handle(current_ch)) {
            return;
        }

        let client_uuid = clients.get_client_uuid(current_ch);
        let _hub_proxy = hubs.get_hub_by_name(hub_name);
        if (!_hub_proxy) {
            return;
        }
        _hub_proxy.client_connect(client_uuid);

        let cli_proxy = clients.get_client_handle(client_uuid);
        cli_proxy.conn_hubs.push(_hub_proxy);
    }

    this.enable_heartbeats = () => {
        clients.enable_heartbeats(current_ch);
    }

    this.disable_heartbeats = () => {
        clients.disable_heartbeats(current_ch);
    }

    this.forward_client_call_hub = (hub_name, module_name, func_name, argvs) => {
        if (!clients.has_client_handle(current_ch)){
            return;
        }
        let uuid = clients.get_client_uuid(current_ch);

        let _hub_proxy = hubs.get_hub_by_name(hub_name);
        if (!_hub_proxy){
            return;
        }

        _hub_proxy.client_call_hub(uuid, module_name, func_name, argvs);
    }

    this.heartbeats = (clienttick) => {
        if (!clients.has_client_handle(current_ch)){
            return;
        }

        clients.refresh_and_check_client(current_ch, Date.now(), clienttick);

        let _client = current_ch.client;
        _client.ack_heartbeats();
    }
}function clientproxy(_ch){
    this.ch = _ch;
    this.caller = new gate_call_client_caller(_ch);
    this.client_time = Date.now();
    this.server_time = Date.now();
    this.conn_hubs = [];

    this.ntf_uuid = function(uuid){
        this.caller.ntf_uuid(uuid);
    }

    this.connect_gate_sucess = function(){
        this.caller.connect_gate_sucess()
    }

    this.connect_hub_sucess = function(hub_name){
        this.caller.connect_hub_sucess(hub_name);
    }

    this.ack_heartbeats = function(){
        this.caller.ack_heartbeats();
    }

    this.call_client = function(module_name, func_name, argvs){
        this.caller.call_client(module_name, func_name, argvs);
    }
}

function clientmanager(hubmng) {
    this.heartbeats_client = [];
    this.client_map = new Map();
    this.client_uuid_map = new Map();
    
    this.hubs = hubmng;
    
    this.enable_heartbeats = (_ch) => {
        let _client = _ch.client;
        this.heartbeats_client.push(_client);
    }
    
    this.disable_heartbeats = (_ch) => {
        let _client = _ch.client;
        let index = this.heartbeats_client.indexOf(_client);
        if (index != -1){
            this.heartbeats_client.splice(index, 1)
        }
    }
    
    this.heartbeat_client = () => {
        let ticktime = Date.now();

        let remove_client = [];
        for (let client of this.client_uuid_map.keys()) {
            if ((client.server_time + 60 * 60 * 1000) < ticktime) {
                remove_client.push(client);
                continue;
            }
    
            if ((client.server_time + 20 * 1000) < ticktime) {
                if (this.heartbeats_client.indexOf(client) != -1) {
                    remove_client.push(client);
                }
            }
        }
        
        for (let _client of remove_client){
            let client_uuid = this.client_uuid_map.get(_client);
            for(let hubproxy of _client.conn_hubs){
                hubproxy.client_disconnect(client_uuid);
            }
        }
    
        for (let _client of remove_client) {
            let index = this.heartbeats_client.indexOf(_client);
            if (index != -1){
                this.heartbeats_client.splice(index, 1);
            }

            let client_uuid = this.client_uuid_map.get(_client);
            this.client_uuid_map.delete(_client);

            this.client_map.delete(client_uuid);
    
            _client.ch.disconnect();
        }
    }
    
    this.refresh_and_check_client = (_ch, servertick, clienttick) => {
        let _client = _ch.client;

        if (((clienttick - _client.client_time) - (servertick - _client.server_time)) > 10 * 1000) {
            let client_uuid = this.client_uuid_map.get(_client);
            for(let hubproxy of _client.conn_hubs){
                hubproxy.client_exception(client_uuid);
            }
        }
    
        _client.server_time = servertick;
        _client.client_time = clienttick;
    }
    
    this.reg_client = (client_uuid, _ch, servertick, clienttick) => {
        let _client = new clientproxy(_ch);
        _ch.client = _client;
        _client.client_time = clienttick;
        _client.server_time = servertick;

        this.client_map.set(client_uuid, _client);
        this.client_uuid_map.set(_client, client_uuid);

        return _client;
    }
    
    this.unreg_client = (_ch) => {
        let _client = _ch.client;

        if (!this.client_uuid_map.has(_client)){
            return;
        }
    
        let _client_uuid = this.client_uuid_map.get(_client);
        getLogger().trace("unreg_client:%s", _client_uuid);
    
        this.client_map.delete(_client_uuid);
        this.client_uuid_map.delete(_client);
        let index = this.heartbeats_client.indexOf(_client);
        if (index != -1) {
            this.heartbeats_client.splice(index);
        }

        for(let hubproxy of _client.conn_hubs){
            hubproxy.client_disconnect(_client_uuid);
        }
    }
    
    this.has_client_handle = (_ch) => {
        let _client = _ch.client;
        return this.client_uuid_map.has(_client);
    }
    
    this.has_client_uuid = (client_uuid) => {
        return this.client_map.has(client_uuid);
    } 
    
    this.get_client_uuid = (_ch) => {
        let _client = _ch.client;
        return this.client_uuid_map.get(_client);
    }
    
    this.get_client_handle = (client_uuid) => {
        return this.client_map.get(client_uuid);
    }
    
    this.for_each_client = (fn) => {
        for (let client_uuid of this.client_map.keys()){
            fn(client_uuid, this.client_map.get(client_uuid));
        }
    }
}function closehandle(){
    this.is_close = false;
}
function gate(argvs){
    event_closure.call(this);

    const uuidv1 = require('uuid/v1');
    this.uuid = uuidv1();

    var cfg = config(argvs[0]);
    this.center_cfg = cfg["center"];
    if (argvs.length > 1){
        this.cfg = cfg[argvs[1]];
    }
    this.root_cfg = cfg;

    var path = require('path');
    configLogger(path.join(this.cfg["log_dir"], this.cfg["log_file"]), this.cfg["log_level"]);
    getLogger().trace("config logger!");

    enet.enet_initialize();

    this.close_handle = new closehandle();

	let _hubmanager = new hubmanager();
    let _clientmanager = new clientmanager(_hubmanager);
    
    let _hub_call_gate = new hub_call_gate_module();
    let _hub_msg_handle = new hub_msg_handle(_clientmanager, _hubmanager);
	_hub_call_gate.add_event_listen("reg_hub", _hub_msg_handle, _hub_msg_handle.reg_hub);
	_hub_call_gate.add_event_listen("connect_sucess", _hub_msg_handle, _hub_msg_handle.connect_sucess);
	_hub_call_gate.add_event_listen("disconnect_client", _hub_msg_handle, _hub_msg_handle.disconnect_client);
	_hub_call_gate.add_event_listen("forward_hub_call_client", _hub_msg_handle, _hub_msg_handle.forward_hub_call_client);
	_hub_call_gate.add_event_listen("forward_hub_call_group_client", _hub_msg_handle, _hub_msg_handle.forward_hub_call_group_client);
	_hub_call_gate.add_event_listen("forward_hub_call_global_client", _hub_msg_handle, _hub_msg_handle.forward_hub_call_global_client);
	let _hub_process = new juggle_process();
    _hub_process.reg_module(_hub_call_gate);
    let inside_ip = this.cfg["inside_ip"];
    let inside_port = this.cfg["inside_port"];
    this._hub_service = new enetservice(inside_ip, inside_port, _hub_process);

    let _client_call_gate = new client_call_gate_module();
    let _client_msg_handle = new client_msg_handle(_clientmanager, _hubmanager);
	_client_call_gate.add_event_listen("connect_server", _client_msg_handle, _client_msg_handle.connect_server);
	_client_call_gate.add_event_listen("cancle_server", _client_msg_handle, _client_msg_handle.cancle_server);
	_client_call_gate.add_event_listen("connect_hub", _client_msg_handle, _client_msg_handle.connect_hub);
	_client_call_gate.add_event_listen("enable_heartbeats", _client_msg_handle, _client_msg_handle.enable_heartbeats);
	_client_call_gate.add_event_listen("disable_heartbeats", _client_msg_handle, _client_msg_handle.disable_heartbeats);
	_client_call_gate.add_event_listen("heartbeats", _client_msg_handle, _client_msg_handle.heartbeats);
    _client_call_gate.add_event_listen("forward_client_call_hub", _client_msg_handle, _client_msg_handle.forward_client_call_hub);
	let _client_process = new juggle_process();
	_client_process.reg_module(_client_call_gate);
    let host = this.cfg["host"];
    let is_ssl = this.cfg["is_ssl"];
	let outside_port = this.cfg["outside_port"];
	let certificate = this.cfg["certificate"];
	let private_key = this.cfg["private_key"];
	let _client_service = new websocketacceptservice(host, outside_port, is_ssl, certificate, private_key, _client_process);
	_client_service.add_event_listen("on_channel_connect", this, (ch) => {
		let uuid = uuidv1();
		let _client_proxy = new clientproxy(ch);
		_client_proxy.ntf_uuid(uuid);
	});
	_client_service.add_event_listen("on_channel_disconnect", this, (ch) => {
		_clientmanager.unreg_client(ch);
	});

	let _center_process = new juggle_process();
	let _connectnetworkservice = new connectservice(_center_process);
	let center_ip = this.center_cfg["ip"];
	let center_port = this.center_cfg["port"];
	_connectnetworkservice.connect(center_ip, center_port, this, (center_ch) => {
        let _centerproxy = new centerproxy(center_ch);
        let _center_call_server = new center_call_server_module();
        let _center_msg_handle = new center_msg_handle(_centerproxy, this.close_handle);
	    _center_call_server.add_event_listen("reg_server_sucess", _center_msg_handle, _center_msg_handle.reg_server_sucess);
	    _center_call_server.add_event_listen("close_server", _center_msg_handle, _center_msg_handle.close_server);
	    _center_process.reg_module(_center_call_server);
	    _centerproxy.reg_server(inside_ip, inside_port, this.uuid);
    });
	
	let _juggleservice = new juggleservice();
	_juggleservice.add_process(_center_process);
	_juggleservice.add_process(_hub_process);
    _juggleservice.add_process(_client_process);
    
    setInterval(_clientmanager.heartbeat_client, 10*1000);

	let juggle_service = _juggleservice;
    let that = this;
    let time_now = Date.now();
    this.poll = () => {
        try {
            this._hub_service.poll();
            juggle_service.poll();
        }
        catch(err) {
            getLogger().error(err);
        }

        if (that.close_handle.is_close){
            enet.enet_deinitialize();
            process.exit();
        }else{
            var _tmp_now = Date.now();
            var _tmp_time = _tmp_now - time_now;
            time_now = _tmp_now;
            if (_tmp_time < 50){
                setTimeout(that.poll, 5);
            }
            else{
                setImmediate(that.poll);
            }
        }
    }
}

process.on('uncaughtException', function (err) {
    getLogger().error(err.message);
    getLogger().error(err.stack);
});

(function main() {
    let args = process.argv.splice(2);
    let _gate = new gate(args);

    _gate.poll();
})();function hub_msg_handle(clients, hubs){

    this.reg_hub = (uuid, hub_name) => {
        let _hubproxy = hubs.reg_hub(hub_name, current_ch);
        _hubproxy.reg_hub_sucess();
    }

    this.connect_sucess = (client_uuid) => {
        if (!clients.has_client_uuid(client_uuid)) {
            return;
        }

        let _hub_name = hubs.get_hub_name(current_ch);
        if (_hub_name == "") {
            return;
        }

        let _client_proxy = clients.get_client_handle(client_uuid);
        _client_proxy.connect_hub_sucess(_hub_name);
    }

    this.disconnect_client = (client_uuid) => {
        if (!clients.has_client_uuid(client_uuid)) {
            return;
        }

        let _client_proxy = clients.get_client_handle(client_uuid);
        clients.unreg_client(_client_proxy.ch);
        _client_proxy.ch.disconnect();
    }

    this.forward_hub_call_client = (client_uuid, module_, func, argvs) => {
        if (!clients.has_client_uuid(client_uuid)) {
            return;
        }

        let _client_proxy = clients.get_client_handle(client_uuid);
        _client_proxy.call_client(module_, func, argvs);
    }

    this.forward_hub_call_group_client = (uuids, _module, func, argvs) => {
        let m_uuids = [];
        for (let client_uuid of uuids) {
            getLogger().trace("send client:%s", client_uuid);
            if (!clients.has_client_uuid(client_uuid)) {
                getLogger().trace("invalid client:%s", client_uuid);
                continue;
            }
            if (m_uuids.indexOf(client_uuid) != -1) {
                continue;
            }

            let _client_proxy = clients.get_client_handle(client_uuid);
            _client_proxy.call_client(_module, func, argvs);

            m_uuids.push(client_uuid);
        }

        if (func == "role_move_status"){
            if (this.send_role_move_status_timetmp){
                let timetmp = Date.now() - this.send_role_move_status_timetmp;
                if (timemtp > 100){
                    getLogger().trace("send_role_move_state timeout timemtp:%d", timemtp);
                }
            }
            this.send_role_move_status_timetmp = Date.now();
        }
    }

    this.forward_hub_call_global_client = (_module, func, argvs) => {
        clients.for_each_client((client_uuid, _client_proxy) => {
            _client_proxy.call_client(_module, func, argv);
        });
    }
}function hubproxy(_hub_name, _ch){
    this.hub_name = _hub_name;
    this.ch = _ch;
    this.caller = new gate_call_hub_caller(_ch);

    this.reg_hub_sucess = function(){
        this.caller.reg_hub_sucess();
    }

    this.client_connect = function(client_uuid){
        this.caller.client_connect(client_uuid);
    }

    this.client_disconnect = function(client_uuid){
        this.caller.client_disconnect(client_uuid);
    }

    this.client_exception = function(client_uuid){
        this.caller.client_exception(client_uuid);
    }

    this.client_call_hub = function(client_uuid, _module, func, argvs){
        this.caller.client_call_hub(client_uuid, _module, func, argvs);
    }
}

function hubmanager() {
    this.hubs_name = new Map();

    this.reg_hub = (hub_name, ch) => {
        let hub_proxy = new hubproxy(hub_name, ch);
        ch.hub_proxy = hub_proxy;

        this.hubs_name.set(hub_name, hub_proxy);

        return hub_proxy;
    }
    
    this.get_hub_by_name = (hub_name) => {
        if (!this.hubs_name.has(hub_name)){
            return null;
        }
        return this.hubs_name.get(hub_name);
    }
    
    this.get_hub_name = (hub_channel) => {
        return hub_channel.hub_proxy.hub_name;
    }
    
    this.for_each_hub = (fn) => {
        for (let hub_name of this.hubs_name.keys()) {
            fn(hub_name, this.hubs_name.get(hub_name));
        }
    }
}