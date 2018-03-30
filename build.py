# 2016-7-4
# build by qianqians
# gencpp

import sys
import os

juggle_js = ['./tools/juggle/js/eventobj.js', './tools/juggle/js/Icaller.js', './tools/juggle/js/Imodule.js', './tools/juggle/js/process.js']
service_web_js = ['./service_web/channel.js', './service_web/connectservice.js', './service_web/juggleservice.js']
service_node_js = ['./service_node_js/channel.js', './service_node_js/acceptservice.js', './service_node_js/connectservice.js', './service_node_js/juggleservice.js']
protcol_js = ['./protcol/caller/centercaller.js', './protcol/caller/client_call_gatecaller.js', './protcol/caller/hub_call_dbproxycaller.js', 
              './protcol/caller/hub_call_gatecaller.js', './protcol/caller/hub_call_hubcaller.js',
              './protcol/module/center_call_hubmodule.js', './protcol/module/center_call_servermodule.js', 
              './protcol/module/dbproxy_call_hubmodule.js', './protcol/module/gate_call_hubmodule.js', './protcol/module/hub_call_hubmodule.js']
module_js = ['./module/modulemng.js']
client_js = ['./component/client/client.js']
hub_js = ['./component/hub/center_msg_handle.js', './component/hub/centerproxy.js', './component/hub/closehandle.js', './component/hub/dbproxy_msg_handle.js',
          './component/hub/dbproxyproxy.js', './component/hub/gate_msg_handle.js', './component/hub/gateproxys.js', './component/hub/hub_msg_handle.js',
          './component/hub/hubproxys.js', './component/hub/hub.js']
event_closure_js = ['./event_closure/event_closure.js']

def read_file(file_list, codes):
        for f_name in file_list:
                file = open(f_name, 'r')
                code_list = file.readlines()
                codes.extend(code_list)

def build_web_client():
        codes = []
        
        read_file(juggle_js, codes)
        read_file(event_closure_js, codes)
        read_file(service_web_js, codes)
        read_file(protcol_js, codes)
        read_file(module_js, codes)
        read_file(client_js, codes)

        return codes

def build_node_js_hub():
        codes = []
        
        read_file(juggle_js, codes)
        read_file(event_closure_js, codes)
        read_file(service_node_js, codes)
        read_file(protcol_js, codes)
        read_file(module_js, codes)
        read_file(hub_js, codes)

        return codes

def build():
        codes = build_web_client()
        open('./build/client.js', 'w').write('%s' % ''.join(codes))  
        codes = build_node_js_hub()
        open('./build/hub.js', 'w').write('%s' % ''.join(codes))  

if __name__ == '__main__':
        build()
