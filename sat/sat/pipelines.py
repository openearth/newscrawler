# -*- coding: utf-8 -*-

# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: http://doc.scrapy.org/en/latest/topics/item-pipeline.html
from scrapy.utils.conf import get_config
from scrapy.exceptions import DropItem
import pika.credentials
import pika
import json
import os
import logging
import numpy as np
import geopy
from geopy.distance import VincentyDistance

# A filter that looks for duplicate items, and drops those items that were already processed.
# Let’s say that our items have a unique id, but our spider returns multiples items with the same id:


class DuplicatePipeline(object):
    def __init__(self):
        with open("items.jl", "w") as f:
            pass
        self.events = []

    def makePolygon(self, latlon):
        '''creating a polygon from the x and y coordinates and the area'''
        L = 150                                                             # 150 km by default
        d = 0.5 * (np.sqrt(L**2 + L**2))                                   # distance from area
        b = [45, 135, 225, 315, 45]                                         # direction in degrees
        geostr = "POLYGON(("                                                # make a string for the polygon
        lat1, lon1 = latlon
        for i in range(5):
            origin = geopy.Point(lat1, lon1)
            destination = VincentyDistance(kilometers=d).destination(origin, b[i])
            lat2, lon2 = destination.latitude, destination.longitude            # create four corners of polygon
            geostr += str(lon2) + ' ' + str(lat2)
            if i != 4:
                geostr += ','
        geostr += "))"
        return geostr

    def process_item(self, item, spider):
        count = 0
        ids_seen = open('items.jl', 'r')
        data = ids_seen.readlines()
        for value in data:
            value = json.loads(value)
            if item['title'] == value['title']:
                raise DropItem("Duplicate item found: %s" % item)
            # ADAPT THE VALUES FOR SURROUNDING, NOW ONLY COMPARISON TO EXACT COORDINATE
            if item['latlon'] not in self.events:
                if (item['latlon'][0] == value['latlon'][0]) and (item['latlon'][1] == value['latlon'][1]):
                    count += 1

                # number of news messages when it is considered an event
                if count == 8:
                    item['event'] = self.makePolygon(item['latlon']), item['latlon']
                    self.events.append(item['latlon'])
            # Check if date of the written item are within certain time, only than write them to the file and return
            # if item['inputTime']

        file = open('items.jl', 'a')
        line = json.dumps(dict(item)) + "\n"
        file.write(line)

        return item

class RabbitMQPipeline(object):
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info("Constructing rabbitmq logger")
        username = get_config().get('rabbitmq', 'username')
        password = get_config().get('rabbitmq', 'password')
        credentials = pika.credentials.PlainCredentials(
            username=username,
            password=password
        )
        host = get_config().get('rabbitmq', 'host')
        parameters = pika.ConnectionParameters(
            host=host,
            port=5672,
            virtual_host='/',
            credentials=credentials
        )
        connection = pika.BlockingConnection(
            parameters=parameters
        )
        channel = connection.channel()
        # we're publishing to two channels, the download request
        # so that a download queue can pick it up
        channel.queue_declare('crisis_download_requests')
        # and a fanout exchange to notify listeners that we've crawled something
        channel.exchange_declare(
            'crisis_crawl',
            type='fanout',
            durable=True
        )
        self.channel = channel

    def process_item(self, item, spider):
        self.logger.info('sending message')
        serialized = json.dumps(dict(item))
        # send to the work queue
        self.channel.basic_publish(
            exchange='',
            routing_key='crisis_download_requests',
            body='%s' % (serialized,)
        )
        # and to the channel
        self.channel.basic_publish(
            exchange='crisis_crawl',
            routing_key='',
            body='%s' % (serialized,)
        )
        return item
