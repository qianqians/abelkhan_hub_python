/* jshint esversion: 6 */

const kcp = require('./kcp');

function kcpservice(ip, port, _process){
    eventobj.call(this);

    this.process = _process;
    this.socket = dgram.createSocket('udp4');
    this.socket.bind(port);
    this.conn = {};
    this.idx = 1;

    this.connect = (rhost, rport, cb)=>{
        var k = rhost+':'+rport;
        if (!this.conn[k]){
            var context = {
                address : rhost,
                port : rport
            };
            var kcpobj = new kcp.KCP(1, context);
            kcpobj.nodelay(0, 10, 0, 0);
            kcpobj.output(this.output.bind(this));
            this.conn[k] = kcpobj;

            let ch = new kcpchannel(kcpobj);
            kcpobj.ch = ch;
            _process.reg_channel(ch);
        }
        cb(this.conn[k].ch);
    };

    this.output = (data, size, context)=>{
        this.socket.send(data, 0, size, context.port, context.address);
    };

    this.socket.on('message',(msg, rinfo)=>{
        //getLogger().trace("message begin");

        var k = rinfo.address+':'+rinfo.port;
        if (!this.conn[k]){
            var context = {
                address : rinfo.address,
                port : rinfo.port
            };

            var kcpobj = new kcp.KCP(1, context);
            kcpobj.nodelay(0, 10, 0, 0);
            kcpobj.output(this.output.bind(this));
            this.conn[k] = kcpobj;

            let ch = new kcpchannel(kcpobj);
            kcpobj.ch = ch;
            _process.reg_channel(ch);

            this.call_event("on_channel_connect", [ch]);
        }
        var kcpobj = this.conn[k];
        kcpobj.input(msg);

        //getLogger().trace("message:%s", msg);
    });

    setInterval(()=>{
        for (let k in this.conn) {
            //getLogger().trace("address:%s", k);
            let kcpobj = this.conn[k];
            kcpobj.update(Date.now());
            while(true){
                let recv = kcpobj.recv();
                if (recv) {
                    kcpobj.ch.on_recv(recv);
                }
                else{
                    break;
                }
            }
       	}
    }, 10);
}
module.exports.kcpservice = kcpservice;