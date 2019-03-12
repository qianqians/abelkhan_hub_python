/* jshint esversion: 6 */

function udpchannel(_udpservice, _rip, _rport){
    eventobj.call(this);

    this.events = [];

    this.socket = _udpservice.socket;
    this.rip = _rip;
    this.rport = _rport;

    this.serial = 1;
    this.remote_serial = 1;

    this.conn_buff = [];
    this.ack_conn_buff = [];

    this.send_buff = [];
    this.recv_ack_buff = [];

    this.connect_req = ()=>{
        var send_header = Buffer.alloc(head_len);
        send_header.writeUInt8(cmdid._connectreq, 0);
        send_header.writeUInt8((0) & 0xff, 1);
        send_header.writeUInt8((0 >> 8) & 0xff, 2);
        send_header.writeUInt8((0 >> 16) & 0xff, 3);
        send_header.writeUInt8((0 >> 24) & 0xff, 4);
        send_header.writeUInt8(0, 5);
        send_header.writeUInt8(0, 6);
        send_header.writeUInt8(0, 7);
        send_header.writeUInt8(0, 8);
        this.socket.send(send_header, this.rport, this.rip);

        this.conn_buff.push(send_header);
    };

    this.connect_ack = ()=>{
        var send_header = Buffer.alloc(head_len);
        send_header.writeUInt8(cmdid._connectack, 0);
        send_header.writeUInt8((0) & 0xff, 1);
        send_header.writeUInt8((0 >> 8) & 0xff, 2);
        send_header.writeUInt8((0 >> 16) & 0xff, 3);
        send_header.writeUInt8((0 >> 24) & 0xff, 4);
        send_header.writeUInt8(0, 5);
        send_header.writeUInt8(0, 6);
        send_header.writeUInt8(0, 7);
        send_header.writeUInt8(0, 8);
        this.socket.send(send_header, this.rport, this.rip);

        this.ack_conn_buff.push(send_header);
    };

    this.connect_complete = ()=>{
        var send_header = Buffer.alloc(head_len);
        send_header.writeUInt8(cmdid._connectcomplete, 0);
        send_header.writeUInt8((0) & 0xff, 1);
        send_header.writeUInt8((0 >> 8) & 0xff, 2);
        send_header.writeUInt8((0 >> 16) & 0xff, 3);
        send_header.writeUInt8((0 >> 24) & 0xff, 4);
        send_header.writeUInt8(0, 5);
        send_header.writeUInt8(0, 6);
        send_header.writeUInt8(0, 7);
        send_header.writeUInt8(0, 8);
        this.socket.send(send_header, this.rport, this.rip);
    };

    this.response = (serial)=>{
        var send_header = Buffer.alloc(head_len);
        send_header.writeUInt8(cmdid._response, 0);
        send_header.writeUInt8((0) & 0xff, 1);
        send_header.writeUInt8((0 >> 8) & 0xff, 2);
        send_header.writeUInt8((0 >> 16) & 0xff, 3);
        send_header.writeUInt8((0 >> 24) & 0xff, 4);
        send_header.writeUInt8(serial & 0xff, 5);
        send_header.writeUInt8((serial >> 8) & 0xff, 6);
        send_header.writeUInt8((serial >> 16) & 0xff, 7);
        send_header.writeUInt8((serial >> 24) & 0xff, 8);
        this.socket.send(send_header, this.rport, this.rip);

        this.recv_ack_buff.push(send_header);
    };

    this.complete = (serial)=>{
        var send_header = Buffer.alloc(head_len);
        send_header.writeUInt8(cmdid._complete, 0);
        send_header.writeUInt8((0) & 0xff, 1);
        send_header.writeUInt8((0 >> 8) & 0xff, 2);
        send_header.writeUInt8((0 >> 16) & 0xff, 3);
        send_header.writeUInt8((0 >> 24) & 0xff, 4);
        send_header.writeUInt8(serial & 0xff, 5);
        send_header.writeUInt8((serial >> 8) & 0xff, 6);
        send_header.writeUInt8((serial >> 16) & 0xff, 7);
        send_header.writeUInt8((serial >> 24) & 0xff, 8);
        this.socket.send(send_header, this.rport, this.rip);
    };

    this.on_recv = (msg)=>{
        getLogger().trace("on_recv begin");

        let len = msg[1] | msg[2] << 8 | msg[3] << 16 | msg[4] << 24;
        let serial = msg[5] | msg[6] << 8 | msg[7] << 16 | msg[8] << 24;

        do{
            if (serial !== this.remote_serial){
                getLogger().trace("on_recv wrong serial serial:%d, this.remote_serial:%d", serial, this.remote_serial);
                break;
            }

            if ( (len + head_len) > msg.length){
                getLogger().trace("on_recv wrong msg.len");
                break;
            }

            var json_str = msg.toString('utf-8', head_len, (len + head_len));
            getLogger().trace("on_recv", json_str);
            this.events.push(JSON.parse(json_str));

            this.remote_serial++;
            if (this.remote_serial === 0x100000000){
                this.remote_serial = 1;
            }

            this.response(serial);

        }while(0);

        getLogger().trace("on_recv end");
    };

    this.on_recv_ack = (serial)=>{
        if (this.send_buff.length <= 0){
            return;
        }

        let msg = this.send_buff[0];
        let _serial = msg[5] | msg[6] << 8 | msg[7] << 16 | msg[8] << 24;

        if (serial === _serial){
            this.send_buff.shift();
        }

        this.complete(serial);
    };

    this.on_recv_complete = (serial)=>{
        if (this.recv_ack_buff.length <= 0){
            return;
        }

        let msg = this.recv_ack_buff[0];
        let _serial = msg[5] | msg[6] << 8 | msg[7] << 16 | msg[8] << 24;

        if (serial === _serial){
            this.recv_ack_buff.shift();
        }
    };

    this.push = function(event){
        var json_str = JSON.stringify(event);
        var json_buff = Buffer.from(json_str, 'utf-8');

        var send_header = Buffer.alloc(head_len);
        send_header.writeUInt8(cmdid._senddatareq, 0);
        send_header.writeUInt8((json_buff.length) & 0xff, 1);
        send_header.writeUInt8((json_buff.length >> 8) & 0xff, 2);
        send_header.writeUInt8((json_buff.length >> 16) & 0xff, 3);
        send_header.writeUInt8((json_buff.length >> 24) & 0xff, 4);
        send_header.writeUInt8(this.serial & 0xff, 5);
        send_header.writeUInt8((this.serial >> 8) & 0xff, 6);
        send_header.writeUInt8((this.serial >> 16) & 0xff, 7);
        send_header.writeUInt8((this.serial >> 24) & 0xff, 8);
        var send_data = Buffer.concat([send_header, json_buff]);

        if (this.send_buff.length <= 0){
            this.socket.send(send_data, this.rport, this.rip);
        }
        this.send_buff.push(send_data);
        getLogger().trace("this.send_buff.length:%d, this.serial:%d", this.send_buff.length, this.serial);

        this.serial++;
        if (this.serial === 0x100000000){
            this.serial = 1;
        }

        getLogger().trace("push", json_str);
    };

    this.pop = function(){
        if (this.events.length === 0){
            return null;
        }

        return this.events.shift();
    };
}
module.exports.udpchannel = udpchannel;