/* jshint esversion: 6 */

const dgram = require('dgram');

function udpservice(ip, port, _process){
    eventobj.call(this);

    this.process = _process;
    this.socket = dgram.createSocket('udp4');
    this.socket.bind(port);

    this.socket.on('message',(msg,rinfo)=>{
        getLogger().trace("message begin");

        while(msg.length >= head_len){
            let cmd = msg[0];
            let len = msg[1] | msg[2] << 8 | msg[3] << 16 | msg[4] << 24;

            if (cmd === cmdid._connectreq){
                this.onConnectReq(rinfo.address, rinfo.port);
            }
            else if (cmd === cmdid._connectack){
                this.onConnectAck(rinfo.address, rinfo.port);
            }
            else if (cmd === cmdid._connectcomplete){
                this.onConnectComplete(rinfo.address, rinfo.port);
            }

            let raddr = rinfo.address + rinfo.port;
            let ch = this.conns[raddr];
            if (!ch){
                getLogger().trace("message invalid ch end");
                return;
            }

            if (cmd === cmdid._senddatareq){
                ch.on_recv(msg);
            }
            else if (cmd === cmdid._response){
                let serial = msg[5] | msg[6] << 8 | msg[7] << 16 | msg[8] << 24;
                ch.on_recv_ack(serial);
            }
            else if (cmd === cmdid._complete){
                let serial = msg[5] | msg[6] << 8 | msg[7] << 16 | msg[8] << 24;
                ch.on_recv_complete(serial);
            }

            if ( msg.length > (len + head_len) ){
                msg = msg.slice(len + head_len);
                getLogger().trace("more msg msg.length:%d", msg.length);
            }
            else{
                break;
            }
        }

        getLogger().trace("message end");
    });

    this.connect = (rip, rport, cb) =>{
        let raddr = rip + rport;
        getLogger().trace("connect raddr:", raddr);
        let ch = this.conns[raddr];
        if (!ch){
            ch = new udpchannel(this, rip, rport);
            this.conns[raddr] = ch;
        }
        this.conn_cbs[raddr] = cb;

        ch.connect_req();
    };
    this.conn_cbs = {};
    this.conns = {};

    this.onConnectReq = (rip, rport)=>{
        let raddr = rip + rport;
        let ch = this.conns[raddr];
        if (!ch){
            ch = new udpchannel(this, rip, rport);
            this.conns[raddr] = ch;
        }
        getLogger().trace("onConnectReq raddr:", raddr);
        ch.connect_ack();
    };

    this.onConnectAck = (rip, rport)=>{
        let raddr = rip + rport;
        let ch = this.conns[raddr];
        ch.connect_complete();
        let cb = this.conn_cbs[raddr];
        if (cb){
            delete this.conn_cbs[raddr];
            ch.conn_buff.shift();
            _process.reg_channel(ch);
            cb(ch);
        }
    };

    this.onConnectComplete = (rip, rport)=>{
        let raddr = rip + rport;
        let ch = this.conns[raddr];
        ch.ack_conn_buff.shift();
        _process.reg_channel(ch);
        that.call_event("on_channel_connect", [ch]);
    };

    let that = this;
    setInterval(()=>{
        for(let key in that.conns){
            let ch = that.conns[key];

            if (ch.conn_buff.length > 0){
                getLogger().trace("%s ch.send_buff.length:%d", key, ch.conn_buff.length);
                let send_data = ch.conn_buff[0];
                this.socket.send(send_data, ch.rport, ch.rip);
            }

            if (ch.ack_conn_buff.length > 0){
                getLogger().trace("%s ch.recv_ack_buff.length:%d", key, ch.ack_conn_buff.length);
                let send_data = ch.ack_conn_buff[0];
                this.socket.send(send_data, ch.rport, ch.rip);
            }

            if (ch.send_buff.length > 0){
                getLogger().trace("%s ch.send_buff.length:%d", key, ch.send_buff.length);
                let send_data = ch.send_buff[0];
                this.socket.send(send_data, ch.rport, ch.rip);
            }

            if (ch.recv_ack_buff.length > 0){
                getLogger().trace("%s ch.recv_ack_buff.length:%d", key, ch.recv_ack_buff.length);
                let send_data = ch.recv_ack_buff[0];
                this.socket.send(send_data, ch.rport, ch.rip);
            }
        }
    }, 10);
}
module.exports.udpservice = udpservice;