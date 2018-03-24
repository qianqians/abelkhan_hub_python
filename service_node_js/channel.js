function channel(_sock){
    eventobj.call(this);

    this.events = [];
    
    this.offset = 0;
    this.data = null;

    this.sock = _sock;
    this.sock.ch = this;
    this.sock.on('data', function(data){
        var u8data = new Uint8Array(data);
        
        var new_data = new Uint8Array(this.ch.offset + u8data.byteLength);
        if (this.ch.data !== null){
            new_data.set(this.ch.data);
        }
        new_data.set(u8data, this.ch.offset);

        while(new_data.length > 4){
            var len = new_data[0] | new_data[1] << 8 | new_data[2] << 16 | new_data[3] << 24;

            if ( (len + 4) > new_data.length ){
                break;
            }

            var json_str = new TextDecoder('utf-8').decode( new_data.subarray( 4, (len + 4) ) );
            this.ch.events.push(Json.parse(json_str));
            
            if ( new_data.length > (len + 4) ){
                new_data = new_data.subarray(len + 4);
            }
            else{
                new_data = null;
                break;
            }
        }

        this.ch.data = new_data;
        if (new_data !== null){
            this.ch.offset = new_data.length;
        }else{
            this.ch.offset = 0;
        }
    });
    this.sock.on('close', function(){
        this.ch.call_event("ondisconnect", [this.ch]);
    });
    this.ws.on('error', function(error){
        this.ch.call_event("ondisconnect", [this.ch]);
    });
    
    this.push = function(event){
        var json_str = Json.stringify(event);
        var u8data = new TextEncoder('utf-8').encode(json_str);

        var send_data = new Uint8Array(4 + u8data.length);
        send_data[0] = u8data.length & 0xff;
        send_data[1] = (u8data.length >> 8) & 0xff;
        send_data[2] = (u8data.length >> 16) & 0xff;
        send_data[3] = (u8data.length >> 24) & 0xff;
        send_data.set(u8data, 4);

        this.sock.write(send_data.buffer);
    }
}