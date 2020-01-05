/* jshint esversion: 6 */

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
module.exports.enetconnectservice = enetconnectservice;