/* jshint esversion: 6 */

var cmdid = {
	_connectreq : 0,
	_connectack : 1,
	_connectcomplete : 2,
	_senddatareq : 3,
	_response : 4,
	_complete : 5,
	_disconnectreq : 6,
	_disconnectack : 7,
	_disconnectcomplete : 8,
};
module.exports.cmdid = cmdid;

/*
* protocol			begin
* cmdid				char
* len				uint32 ## data len ##
* serial			uint32
* data				char *
* protocol end
*/
var head_len = 1 + 4 + 4;
module.exports.head_len = head_len;