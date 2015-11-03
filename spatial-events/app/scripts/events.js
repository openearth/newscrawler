// global: map, SockJS, Stomp, omnivore
var domain = '54.76.43.47';

var markers;
var ws = new SockJS('http://' + domain + '/stomp');
var client = Stomp.over(ws);

//client.debug = null;
client.heartbeat.outgoing = 0; // client will not send heartbeats
client.heartbeat.incoming = 0; // client does not want to receive heartbeats

function fixCoords(coords) {
    // Work around leaflet bug....pfff...
    // update if any coordinates is < 180
    if (
        _.any(
            _.map(
                coords._latlngs,
                function(x) {
                    return x.lng < -0;
                }
            )
        )
    ) {
        // this whole thing is needed to fix some bug in leaflet where
        // coordinates around the 180 degree break
        coords._latlngs = _.map(
            coords._latlngs,
            function(x, i) {
                if (i > 0) {
                    // if we have a jump of more than 180deg
                    // this -> coords._latlngs
                    if ((x.lng - this[i - 1].lng) < -180.0) {
                        var wrapped = new L.latLng(x.lat, x.lng + 360, true);
                        this[i] = wrapped;
                        return wrapped;
                    }
                    if ((x.lng - this[i - 1].lng) > 180.0) {
                        var wrapped = new L.latLng(x.lat, x.lng - 360, true);
                        this[i] = wrapped;
                        return wrapped;
                    }
                }
                return x;
            },
            coords._latlngs
        );
    }
    return coords;
}

var subscription;


var purpleIcon = L.icon({
    iconUrl: 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png'
});
var yellowIcon = L.icon({
    iconUrl: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
});

var redIcon = L.icon({
    iconUrl: 'http://www.animated-gifs.eu/website-exclamation/0002.gif'
});

var on_connect = function() {
    console.log('connected');
    subscription = client.subscribe(
        '/exchange/crisis_crawl',
        function(message) {
            //map.removeLayer(markers);
            var obj = JSON.parse(message.body);
            if (obj.src === 'emmspider'){
                var marker = new L.marker(obj.latlon, {
                    id: obj.id,
                    time:obj.time,
                    icon:purpleIcon
                })
                        .bindPopup("<a target='_blank' href=" +
                                   obj.link + ">" + obj.title +
                                   "</a><br><br>"+ obj.description +
                                   '<br><br>' + obj.itemTime);
                markers.addLayer(marker);}
            else if(obj.src === 'floodlist'){
                var marker = new L.marker(obj.latlon, {
                    id: obj.id,
                    time:obj.time,
                    icon: yellowIcon
                })
                        .bindPopup("<a target='_blank' href=" + obj.link +
                                   ">" + obj.title +
                                   "</a><br><br>"+ obj.description +
                                   '<br><br>' + obj.itemTime);
                markers.addLayer(marker);}
            else {
                // satellite image
                var wkt = obj.footprint;
                var feature = omnivore.wkt.parse(wkt);
                feature.setStyle({fillColor: 'blue'});
                // replace coords by fixed coordinates (wrap around 180o)
                var coords = _.values(feature._layers)[0];
                coords = fixCoords(coords);
                feature.addTo(map);
            }
            if (_.get(obj, 'event', '') !== '' ) {
                // We have an event, notify the incident listeners
                // which will send it to the rabbitmq server.
                var feature = omnivore.wkt.parse(obj.event[0]);
                var coords = _.values(feature._layers)[0];
                coords = fixCoords(coords);
                $('#modal-form').modal('hide');

                var layer = $('#modal-form').data();
                layer = {
                    type: 'Feature',
                    properties: {
                        startDate: moment().add(-1, 'weeks').toJSON(),
                        endDate: moment().add(1, 'weeks').toJSON(),
                        incidentId: uuid(),
                        tags: "['Flood']"
                    },
                    geometry :  {type: "Polygon",
                                 coordinates: [[[coords._latlngs[0].lng, coords._latlngs[0].lat],
                                                [coords._latlngs[1].lng, coords._latlngs[1].lat],
                                                [coords._latlngs[2].lng, coords._latlngs[2].lat],
                                                [coords._latlngs[3].lng, coords._latlngs[3].lat],
                                                [coords._latlngs[0].lng, coords._latlngs[0].lat]]]
                                }
                };
                var event = new CustomEvent('incident', {'detail': layer});
                document.dispatchEvent(event);
                eventmarker = new L.marker(obj.event[1], { icon:redIcon});
                eventmarker.addTo(map);
            }
        }
    );
    map.addLayer(markers);
    document.addEventListener(
        'incident',
        function(evt) {
            console.log('send to rabbitmq', evt.detail);
            client.send('/exchange/crisis_incident', {"content-type":"application/json"}, JSON.stringify(evt.detail));
        }
    );

};

var on_error = function(evt) {
    console.log('error', evt);
};
client.connect('public', 'public', on_connect, on_error, '/');
