#!/bin/sh

pushd spatial-events
gulp serve &
popd

pushd eventlistener
./eventlistener &
popd

pushd Sat2
scrapyd &
popd

pushd sat
scrapy crawl newsspider &
popd
