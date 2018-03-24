function dbproxyproxy(ch){
    this.hub_call_dbproxy = new dbproxy_call_hub_caller(ch);
    this.callback_set = {};
    this.end_cb_set = {};

    this.reg_hub = function(uuid){
		this.hub_call_dbproxy.reg_hub(uuid);
	}

    this.getCollection = function( db,  collection ){
        return new Collection(db, collection, this);
    }

    function Collection(db, collection, proxy){
        this.db = db;
        this.collection = collection;
        this.dbproxy = proxy;

        this.createPersistedObject = function( object_info, cb ){
            var UUID = require('uuid');
            var callbackid = UUID.v1();
            this.dbproxy.hub_call_dbproxy.create_persisted_object(this.db, this.collection, object_info, callbackid);
            this.dbproxy.callback_set[callbackid] = cb;
        }

        this.updataPersistedObject = function( query_json,  updata_info,  cb ){
            var UUID = require('uuid');
            var callbackid = UUID.v1();
            this.dbproxy.hub_call_dbproxy.updata_persisted_object(this.db, this.collection, query_json, updata_info, callbackid);
            this.dbproxy.callback_set[callbackid] = cb;
        }

        this.getObjectCount = function( query_json, cb ){
            var UUID = require('uuid');
            var callbackid = UUID.v1();
            this.dbproxy.hub_call_dbproxy.get_object_count(this.db, this.collection, query_json, callbackid);
            this.dbproxy.callback_set[callbackid] = cb;
        }

        this.getObjectInfo = function( query_json, cb, end ){
            var UUID = require('uuid');
            var callbackid = UUID.v1();
            this.dbproxy.hub_call_dbproxy.get_object_info(this.db, this.collection, query_json, callbackid);
            this.dbproxy.callback_set[callbackid] = cb;
            this.dbproxy.end_cb_set[callbackid] = end;
        }

        this.removeObject = function( query_json, cb ){
            var UUID = require('uuid');
            var callbackid = UUID.v1();
            this.dbproxy.hub_call_dbproxy.remove_object(this.db, this.collection, query_json, callbackid);
            this.dbproxy.callback_set[callbackid] = cb;
        }
    }

    this.begin_callback = function(callbackid){
		if (callback_set[callbackid]){
			return callback_set[callbackid];
		}

		return null;
	}

	this.end_callback = function(callbackid){
		if (callback_set[callbackid])
		{
			delete callback_set[callbackid];
		}
	}

    this.end_get_object_info_callback = function(callbackid){
        end_callback(callbackid);

        if (end_cb_set[callbackid]){
            return end_cb_set[callbackid];
        }

        return null;
    }



}
