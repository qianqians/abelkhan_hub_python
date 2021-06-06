/**
 * Make sure the charset of the page using this script is
 * set to utf-8 or you will not get the correct results.
 */
var utf8 = (function () {
    var highSurrogateMin = 0xd800,
        highSurrogateMax = 0xdbff,
        lowSurrogateMin  = 0xdc00,
        lowSurrogateMax  = 0xdfff,
        surrogateBase    = 0x10000;
    
    function isHighSurrogate(charCode) {
        return highSurrogateMin <= charCode && charCode <= highSurrogateMax;
    }
    
    function isLowSurrogate(charCode) {
        return lowSurrogateMin <= charCode && charCode <= lowSurrogateMax;
    }
    
    function combineSurrogate(high, low) {
        return ((high - highSurrogateMin) << 10) + (low - lowSurrogateMin) + surrogateBase;
    }
    
    /**
     * Convert charCode to JavaScript String
     * handling UTF16 surrogate pair
     */
    function chr(charCode) {
        var high, low;
        
        if (charCode < surrogateBase) {
            return String.fromCharCode(charCode);
        }
        
        // convert to UTF16 surrogate pair
        high = ((charCode - surrogateBase) >> 10) + highSurrogateMin,
        low  = (charCode & 0x3ff) + lowSurrogateMin;
        
        return String.fromCharCode(high, low);
    }
    
    /**
     * Convert JavaScript String to an Array of
     * UTF8 bytes
     * @export
     */
    function stringToBytes(str) {
        var bytes = [],
            strLength = str.length,
            strIndex = 0,
            charCode, charCode2;
        
        while (strIndex < strLength) {
            charCode = str.charCodeAt(strIndex++);
            
            // handle surrogate pair
            if (isHighSurrogate(charCode)) {
                if (strIndex === strLength) {
                    throw new Error('Invalid format');
                }
                
                charCode2 = str.charCodeAt(strIndex++);
                
                if (!isLowSurrogate(charCode2)) {
                    throw new Error('Invalid format');
                }
                
                charCode = combineSurrogate(charCode, charCode2);
            }
            
            // convert charCode to UTF8 bytes
            if (charCode < 0x80) {
                // one byte
                bytes.push(charCode);
            }
            else if (charCode < 0x800) {
                // two bytes
                bytes.push(0xc0 | (charCode >> 6));
                bytes.push(0x80 | (charCode & 0x3f));
            }
            else if (charCode < 0x10000) {
                // three bytes
                bytes.push(0xe0 | (charCode >> 12));
                bytes.push(0x80 | ((charCode >> 6) & 0x3f));
                bytes.push(0x80 | (charCode & 0x3f));
            }
            else {
                // four bytes
                bytes.push(0xf0 | (charCode >> 18));
                bytes.push(0x80 | ((charCode >> 12) & 0x3f));
                bytes.push(0x80 | ((charCode >> 6) & 0x3f));
                bytes.push(0x80 | (charCode & 0x3f));
            }
        }
        
        return bytes;
    }

    /**
     * Convert an Array of UTF8 bytes to
     * a JavaScript String
     * @export
     */
    function bytesToString(bytes) {
        var str = '',
            length = bytes.length,
            index = 0,
            byte,
            charCode;
        
        while (index < length) {
            // first byte
            byte = bytes[index++];
            
            if (byte < 0x80) {
                // one byte
                charCode = byte;
            }
            else if ((byte >> 5) === 0x06) {
                // two bytes
                charCode = ((byte & 0x1f) << 6) | (bytes[index++] & 0x3f);
            }
            else if ((byte >> 4) === 0x0e) {
                // three bytes
                charCode = ((byte & 0x0f) << 12) | ((bytes[index++] & 0x3f) << 6) | (bytes[index++] & 0x3f);
            }
            else {
                // four bytes
                charCode = ((byte & 0x07) << 18) | ((bytes[index++] & 0x3f) << 12) | ((bytes[index++] & 0x3f) << 6) | (bytes[index++] & 0x3f);
            }
            
            str += chr(charCode);
        }
        
        return str;
    }
    
    return {
        stringToBytes: stringToBytes,
        bytesToString: bytesToString
    };
}());

function channel(_ws){
    eventobj.call(this);

    this.events = [];
    
    this.offset = 0;
    this.data = null;

    this.ws = _ws;
    this.ws.ch = this;
    this.ws.binaryType = "arraybuffer";
    this.ws.onmessage = function(evt){
        var u8data = new Uint8Array(evt.data);
        
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

            var str_bytes = new_data.subarray(4, (len + 4))
            var json_str = utf8.bytesToString(str_bytes);
            //new TextDecoder('utf-8').decode(new_data.subarray(4, (len + 4)));
            var end = 0;
            for(var i = 0; json_str[i] != '\0' & i < json_str.length; i++){
                end++;
            }
            json_str = json_str.substring(0, end);
            console.log(json_str);
            this.ch.events.push(JSON.parse(json_str));
            
            if ( new_data.length > (len + 4) ){
                var _data = new Uint8Array(new_data.length - (len + 4));
                _data.set(new_data.subarray(len + 4));
                new_data = _data;
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
    }
    this.ws.onopen = function(){
        this.ch.call_event("onopen", [this.ch]);
    }
    this.ws.onclose = function(){
        this.ch.call_event("ondisconnect", [this.ch]);
    }
    this.ws.onerror = function(){
        this.ch.call_event("ondisconnect", [this.ch]);
    }
    
    this.push = function(event){
        var json_str = JSON.stringify(event);
        var str_bytes = utf8.stringToBytes(json_str);
        var u8data = new Uint8Array(str_bytes);

        var send_data = new Uint8Array(4 + u8data.length);
        send_data[0] = u8data.length & 0xff;
        send_data[1] = (u8data.length >> 8) & 0xff;
        send_data[2] = (u8data.length >> 16) & 0xff;
        send_data[3] = (u8data.length >> 24) & 0xff;
        send_data.set(u8data, 4);

        this.ws.send(send_data.buffer);
    }

    this.pop = function(){
        if (this.events.length === 0){
            return null;
        }

        return this.events.shift();
    }

    this.clear = function(){
        this.events = [];
    }

    this.close = function(){
        this.ws.close()
    }
}
