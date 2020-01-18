/* jshint esversion: 6 */

function kcpchannel(kcpobj){
    eventobj.call(this);

    this.events = [];

    this.on_recv = (msg)=>{
        getLogger().trace("on_recv begin");

        while(msg.length > 4){
            let len = msg[0] | msg[1] << 8 | msg[2] << 16 | msg[3] << 24;

            if ( (len + 4) > msg.length){
                getLogger().trace("on_recv wrong msg.len");
                break;
            }

            var json_str = msg.toString('utf-8', 4, (len + 4));
            getLogger().trace("on_recv", json_str);
            this.events.push(JSON.parse(json_str));

            if ( msg.length > (len + 4) ){
                 msg = msg.slice(len + 4);
            }
            else{
                break;
            }
        }

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

        kcpobj.send(send_data);

        getLogger().trace("push", json_str);
    };

    this.pop = function(){
        if (this.events.length === 0){
            return null;
        }

        return this.events.shift();
    };
}
module.exports.kcpchannel = kcpchannel;