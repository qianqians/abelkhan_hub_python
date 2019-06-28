function channel(_sock){
    eventobj.call(this);

    this.events = [];

    this.data = null;

    this.sock = _sock;
    var ch = this;
    this.sock.binaryType = "Arraybuffer";
    _sock.on('message', function(data){
        try
        {
            getLogger().trace("begin on data");

            var new_data = data;
            if (ch.data !== null){
                new_data = Buffer.concat([ch.data, new_data]);
            }

            while(new_data.length > 4){
                var len = new_data[0] | new_data[1] << 8 | new_data[2] << 16 | new_data[3] << 24;

                if ( (len + 4) > new_data.length ){
                    break;
                }

                var json_str = new_data.toString('utf-8', 4, (len + 4));
                var end = 0;
                for(var i = 0; json_str[i] != '\0' & i < json_str.length; i++){
                    end++;
                }
                json_str = json_str.substring(0, end);
                getLogger().trace(json_str+"--------get");
                ch.events.push(JSON.parse(json_str));

                if ( new_data.length > (len + 4) ){
                    new_data = new_data.slice(len + 4);
                }
                else{
                    new_data = null;
                    break;
                }
            }

            ch.data = new_data;

            getLogger().trace("end on data");
        }
        catch(err)
        {
            getLogger().error(err);
        }
    });
    _sock.on('close', function(){
        ch.call_event("ondisconnect", [ch]);
    });
    _sock.on('error', function(error){
        ch.call_event("ondisconnect", [ch]);
    });

    this.push = function(event){
        var json_str = JSON.stringify(event);
        var json_buff = Buffer.from(json_str, 'utf-8');

        var send_header = Buffer.alloc(4);
        send_header.writeUInt8(json_buff.length & 0xff, 0);
        send_header.writeUInt8((json_buff.length >> 8) & 0xff, 1);
        send_header.writeUInt8((json_buff.length >> 16) & 0xff, 2);
        send_header.writeUInt8((json_buff.length >> 24) & 0xff, 3);
        var send_data = Buffer.concat([send_header, json_buff]);

       // _sock.write(send_data);
       _sock.send(send_data);
        getLogger().trace(json_str+"--------send");
    }

    this.pop = function(){
        if (this.events.length === 0){
            return null;
        }

        return this.events.shift();
    }
}
