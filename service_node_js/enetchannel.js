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
module.exports.enetchannel = enetchannel;