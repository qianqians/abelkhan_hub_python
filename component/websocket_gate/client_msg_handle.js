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
}