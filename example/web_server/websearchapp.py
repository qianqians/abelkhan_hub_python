# -*- coding: UTF-8 -*-
# search
# create at 2016/3/11
# autor: qianqians

from flask import *
from flask.ext.cors import CORS

app = Flask(__name__)
cors = CORS(app, resources={r"/*": {"origins": "*"}})
