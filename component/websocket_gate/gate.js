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
    //let _hub_service = new acceptservice(inside_ip, inside_port, _hub_process);
    this._hub_service = new enetservice(inside_ip, inside_port, _hub_process);
    //this._hub_service = new kcpservice(inside_ip, inside_port, _hub_process);

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
	let outside_ip = this.cfg["outside_ip"];
	let outside_port = this.cfg["outside_port"];
	let _client_service = new websocketacceptservice(outside_ip, outside_port, _client_process);
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
            //this._hub_service.poll();
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
})();