# -*- coding: UTF-8 -*-
# search
# create at 2016/3/11
# autor: qianqians

import sys
sys.path.append('../3rdparty/')

from flask import *
from flask_cors import CORS

from websearchapp import *
from client import *

if __name__ == '__main__':
    try:
        app.run("0.0.0.0", "8080", threaded = True)
    except:
        traceback.print_exc()
