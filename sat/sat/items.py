# -*- coding: utf-8 -*-

# Define here the models for your scraped items
#
# See documentation in:
# http://doc.scrapy.org/en/latest/topics/items.html

import scrapy


class SatItem(scrapy.Item):
    """Sentinel Item in JSON naming convention"""
    title = scrapy.Field()
    description = scrapy.Field()
    latlon = scrapy.Field()
    link = scrapy.Field()
    id = scrapy.Field()
    inputTime = scrapy.Field()
    itemTime = scrapy.Field()
    src = scrapy.Field()
    # tuple of polygon + latlong for marker
    event = scrapy.Field()
