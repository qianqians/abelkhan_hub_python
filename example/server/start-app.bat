start center.exe config.txt center
sleep 10
start dbproxy.exe config.txt dbproxy
sleep 2
start node websocket_gate.js config.txt gate
#start node --inspect-brk ../hub_server/hub_server.js config.txt hub_server
#start node ../hub_server/hub_server.js config.txt hub_server

