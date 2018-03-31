var hub = require('../lib/hub.js');

var args = process.argv.splice(2);
var _hub = new hub.hub(args);
var ack_conn_module = {
    client_connect_hub : function(client_uuid){
        _hub.gates.call_client(client_uuid, "conn_module", "connect_hub_server_fucess");
    }
};
_hub.modules.add_module("ack_conn_module", ack_conn_module);

process.on('uncaughtException', function (err) {
    console.log(err);
    console.log(err.stack);
});

process.nextTick(_hub.poll);

