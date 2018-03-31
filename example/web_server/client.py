# -*- coding: UTF-8 -*-
# search
# create at 2016/3/1
# autor: qianqians
from flask import *
import uuid
import traceback

from websearchapp import *

import os
fileclient = open(os.path.split(os.path.realpath(__file__))[0] + '/../lib/client.js', 'r')
fileclientdata = fileclient.read()
fileclient.close()

@app.route('/client.js')
def file_client():
    from io import BytesIO
    try:
        return Response(BytesIO(fileclientdata), mimetype='js')
    except:
        traceback.print_exc()

@app.route('/')
def index():
    try:
        sid = str(uuid.uuid1())
        return render_template("client_html.html", uuid=sid)
    except:
        traceback.print_exc()