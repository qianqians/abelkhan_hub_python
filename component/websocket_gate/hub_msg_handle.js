function hub_msg_handle(clients, hubs){

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
        for (let uuid of uuids) {
            if (!clients.has_client_uuid(client_uuid)) {
                continue;
            }
            if (m_uuids.indexOf(uuid) != -1) {
                continue;
            }

            let _client_proxy = clients.get_client_handle(client_uuid);
            _client_proxy.call_client(_module, func, argvs);

            m_uuids.push(uuid);
        }
    }

    this.forward_hub_call_global_client = (_module, func, argvs) => {
        clients.for_each_client((client_uuid, _client_proxy) => {
            _client_proxy.call_client(_module, func, argv);
        });
    }
}