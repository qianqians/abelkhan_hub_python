var hub = require('../lib/hub.js');

var args = process.argv.splice(2);
var _hub = new hub.hub(args);
var conn_module = {
    connect_hub_server : function(){
        _hub.hubs.call_hub("hub_server1", "ack_conn_module", "client_connect_hub", _hub.gates.current_client_uuid);
    }
};
_hub.modules.add_module("conn_module", conn_module);

process.on('uncaughtException', function (err) {
    console.log(err);
    console.log(err.stack);
});

process.nextTick(_hub.poll);

