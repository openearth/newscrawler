# -*- coding: utf-8 -*-
import logging

from scrapy.spiders import XMLFeedSpider, Spider, CrawlSpider, Rule
from scrapy.spiders import CrawlSpider, Rule
import json
import requests
from xml.etree import ElementTree
from sat.items import SatItem
import datetime as dt

start_urls = []
tags  = np.loadtxt('tags.txt', dtype = str, delimiter = "\n")
points =[]

class newsspider(XMLFeedSpider):
    name = 'newsspider'
    start_urls = []
    for t in range(len(tags)):
        start_urls.append('http://emm.newsbrief.eu/rss?type=search&mode=advanced&atleast=' + tags[t])
    start_urls.append('http://feeds.feedburner.com/Floodlist')
    namespaces = [
        ("georss", "http://www.georss.org/georss")]

    def text_scan(self, description):
        text = description.split(" ")
        textlist=[]
        for i in range(len(text)):
            for j in text[i]:
                string = "..."
                if j.isdigit() == True:
                    for k in range(-4,4):
                        if ((i+k) >= 0) and ((i+k) < len(text)):
                            string += text[i+k] +" "
                    string += "..."
            if string != "...":
                textlist.append(string)
        return textlist

    def check_description(self,description,title):
        for t in tags:
            if t in description.lower() or t in title.lower():
                return True
        return False

    def parseFlood(self,text):
	accesstoken = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
        headers = {'X-AG-Access-Token' : accesstoken, 'Content-Type' : 'text/raw', 'outputformat' : 'text/n3'}
        calais_url = 'https://api.thomsonreuters.com/permid/calais'
        response = requests.post(calais_url,text, headers=headers, timeout = 80, verify = False)
        content =  response.text
        content = content.encode('utf-8')
        jsonfile =  json.loads(content)
        lat,lon = 0,0
        for i in jsonfile:
            if 'http://d.opencalais.com/genericHasher-1/' in i:
                if 'resolutions' in jsonfile[i]:
                    lat = jsonfile[i]['resolutions'][0]['latitude']
                    lon = jsonfile[i]['resolutions'][0]['longitude']
                    break
        return lat,lon

    def parse_node(self, response, selector):
        # General
        textstring = selector.xpath('string(//item/description)').extract()
        description = self.text_scan(textstring[0])
        titlestring = selector.xpath('string(//item/title)').extract()
        item = SatItem()
        keepItem = self.check_description(textstring[0],titlestring[0])

        if keepItem:
            # Emm newsbrief
            if response.url != 'http://feeds.feedburner.com/Floodlist':
                point = selector.xpath("string(//item/georss:point)").extract()
                if point[0] != "":
                    # converting georss:point to coordinates
                    point = point[0].replace("u'", "")
                    point = point.replace("'", "")
                    lat1, lon1 = point.split(" ")
                    lon1 = float(lon1)
                    lat1 = float(lat1)

                    # setting all the items
                    item['latlon'] = str(lat1) ,str(lon1)
                    item['src'] = 'emmspider'

            #Floodlist
            else:
                lat,lon = self.parseFlood((textstring[0]+ titlestring[0]))
                item['latlon'] =  str(lat) , str(lon)
                item['src'] = 'floodlist'

            item['itemTime'] = selector.xpath("string(//item/pubDate)").extract()
            item['inputTime'] = str(dt.datetime.now())
            item['title'] = titlestring[0]
            item['link'] = selector.xpath('string(//item/link)').extract()
            item['description'] = description
            item['event'] = ''
            return item
