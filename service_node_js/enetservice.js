/* jshint esversion: 6 */
function enetservice(ip, port, _process){
    eventobj.call(this);

    this.process = _process;
    this.host = enet.enet_host_create(ip, port, 2048);
    getLogger().trace("enetservice host handle:%d", this.host);

    this.poll = ()=>{
        let event = enet.enet_host_service(this.host);
        if (event){
            switch(event.type)
            {
            case 1:
                {
                    let raddr = event.ip + ":" + event.port;
                    getLogger().trace("enetservice poll raddr:%s", raddr);
                    let ch = this.conns[raddr];
                    if (!ch){
                        ch = new enetchannel(this.host, event.host, event.port);
                        this.conns[raddr] = ch;
                        _process.reg_channel(ch);
                    }

                    let cb = this.conn_cbs[raddr];
                    if (cb){
                        delete this.conn_cbs[raddr];
                        cb(ch);
                    }
                    else{
                        this.call_event("on_channel_connect", [ch]);
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

        getLogger().trace("enetservice connect raddr:%s", raddr);

        enet.enet_host_connect(this.host, rhost, rport);
    };
    this.conn_cbs = {};
    this.conns = {};
}
module.exports.enetservice = enetservice;