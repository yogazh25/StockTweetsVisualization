import argparse
import csv
from collections import Counter
from flask import Flask, request
from threading import Timer, Thread
import json
import requests
import pysentiment as ps
from datetime import timedelta
from flask import make_response, request, current_app
from functools import update_wrapper

class UserClassification:
    def __init__(self, classification):
        self.classification = classification
        self.users = set()
        self.num_messages = 0

class Sector:
    def __init__(self, name):
        self.name = name
        self.positive = 0
        self.negative = 0
        self.users = set()
        self.num_messages = 0
        self.words = Counter()

class Stock:
    def __init__(self, symbol):
        self.symbol = symbol
        self.positive = 0
        self.negative = 0
        self.users = set()
        self.num_messages = 0
        self.words = Counter()

class TwitsAnalyzer:
    def __init__(self):
        self.stocks = {}
        self.sectors = {}
        self.user_classification = {}
        self.dict = ps.HIV4()

    def analyze(self, twit):
        tokens = self.dict.tokenize(twit['body'])
        score = self.dict.get_score(tokens)
        user_info = twit['user']
        classification_list = user_info['classification']
        if len(classification_list) == 0:
            classification_list.append('others')
        for classification in classification_list:
            if classification not in self.user_classification:
                self.user_classification[classification] = UserClassification(classification)
            self.user_classification[classification].users.add(user_info['username'])
            self.user_classification[classification].num_messages += 1
        if 'symbols' in twit:
            for symbol_info in twit['symbols']:
                symbol = symbol_info['symbol']
                if symbol not in self.stocks:
                    self.stocks[symbol] = Stock(symbol)
                self.stocks[symbol].num_messages += 1
                self.stocks[symbol].users.add(user_info['username'])
                self.stocks[symbol].positive += score['Positive']
                self.stocks[symbol].negative += score['Negative']
                self.stocks[symbol].words.update(tokens)
                sector = symbol_info['sector']
                if sector is None:
                    sector = 'others'
                print(symbol, sector)
                if sector not in self.sectors:
                    self.sectors[sector] = Sector(sector)
                self.sectors[sector].num_messages += 1
                self.sectors[sector].users.add(user_info['username'])
                self.sectors[sector].positive += score['Positive']
                self.sectors[sector].negative += score['Negative']
                self.sectors[sector].words.update(tokens)

class TwitsProducer:
    def __init__(self, twits_file_path, num_twits):
        self.twits_file_path = twits_file_path
        self.num_twits = num_twits
        self.thread = None

    def start(self):
        self.twits_file = open(self.twits_file_path)
        if self.thread is None:
            self.thread = Timer(1, self.produce_twits)
            self.thread.start()

    def stop(self):
        if self.thread is not None:
            self.thread.cancel()
            self.thread = None
            self.twits_file.close()

    def produce_twits(self):
        for i in range(self.num_twits):
            twit = json.loads(self.twits_file.readline())
            global analyzer
            analyzer.analyze(twit)
            if not twit:
                self.stop()
        self.thread = Timer(1, self.produce_twits)
        self.thread.start()

app = Flask(__name__)

def crossdomain(origin=None, methods=None, headers=None,
                max_age=21600, attach_to_all=True,
                automatic_options=True):
    if methods is not None:
        methods = ', '.join(sorted(x.upper() for x in methods))
    if headers is not None and not isinstance(headers, basestring):
        headers = ', '.join(x.upper() for x in headers)
    if not isinstance(origin, basestring):
        origin = ', '.join(origin)
    if isinstance(max_age, timedelta):
        max_age = max_age.total_seconds()

    def get_methods():
        if methods is not None:
            return methods

        options_resp = current_app.make_default_options_response()
        return options_resp.headers['allow']

    def decorator(f):
        def wrapped_function(*args, **kwargs):
            if automatic_options and request.method == 'OPTIONS':
                resp = current_app.make_default_options_response()
            else:
                resp = make_response(f(*args, **kwargs))
            if not attach_to_all and request.method != 'OPTIONS':
                return resp

            h = resp.headers

            h['Access-Control-Allow-Origin'] = origin
            h['Access-Control-Allow-Methods'] = get_methods()
            h['Access-Control-Max-Age'] = str(max_age)
            if headers is not None:
                h['Access-Control-Allow-Headers'] = headers
            return resp

        f.provide_automatic_options = False
        return update_wrapper(wrapped_function, f)
    return decorator

@app.route('/sector', methods=['GET'])
@crossdomain(origin='*')
def handle_sector_request():
    sector_name = request.args['sector']
    global analyzer
    sector = Sector(sector_name)
    if sector_name in analyzer.sectors:
        sector = analyzer.sectors[sector_name]
    return json.dumps({
        'users': len(sector.users),
        'messages': sector.num_messages,    
        'positive': sector.positive,
        'negative': sector.negative,
        'words': sector.words.most_common(500)
    })

@app.route('/stock', methods=['GET'])
@crossdomain(origin='*')
def handle_stock_request():
    symbol = request.args['symbol']
    global analyzer
    stock = Stock(symbol)
    if symbol in analyzer.stocks:
        stock = analyzer.stocks[symbol]
    return json.dumps({
        'users': len(stock.users),
        'messages': stock.num_messages,
        'positive': stock.positive,
        'negative': stock.negative,
        'words': stock.words.most_common(500)
    })

@app.route('/user_classification', methods=['GET'])
@crossdomain(origin='*')
def handle_user_classification_request():
    classification_name = request.args['classification']
    global analyzer
    classification = UserClassification(classification_name)
    if classification_name in analyzer.user_classification:
        classification = analyzer.user_classification[classification_name]
    return json.dumps({
        'users': len(classification.users),
        'messages': classification.num_messages
    })

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--replay')
    parser.add_argument('--num_twits', type=int, default=1)
    args = parser.parse_args()

    if args.replay is not None:
        global producer
        producer = TwitsProducer(args.replay, args.num_twits)
        global analyzer
        analyzer = TwitsAnalyzer()
        producer.start()
        app.run(debug=True)
        producer.stop()
    else:
        global analyzer
        analyzer = TwitsAnalyzer()
        app.run(debug=True)
