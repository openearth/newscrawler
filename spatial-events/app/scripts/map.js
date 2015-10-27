/* exported addMap */
/*eslint-disable no-unused-vars */
'use strict';

var map;
var markers;
function uuid() {
    // Generate a somewhat unique uuid
    var text = ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx')
            .replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0;
                var v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
    return text;
}
function addMap() {
    // better background map
    // L.mapbox.accessToken = 'pk.eyJ1Ijoic2lnZ3lmIiwiYSI6Il8xOGdYdlEifQ.3-JZpqwUa3hydjAJFXIlMA';
    // var map = L.mapbox.map('map', 'siggyf.c74e2e04');

    map = L.map('map',{
	minZoom : 2,
	maxZoom : 7});
    map.setView([51.505, -0.09], 3);
    L.tileLayer(
        'http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
        {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
        }
    ).addTo(map);
    map.properties = {
        editing: false,
        deleting: false,
    }; 
    
    // Initialise the FeatureGroup to store editable layers
    var editableLayers = new L.FeatureGroup();
    markers = new L.MarkerClusterGroup({
	    iconCreateFunction: function (cluster) {
		var childCount = cluster.getChildCount();
		var c = ' marker-cluster-';
		if (childCount < 10) {
		    c += 'small';
		} else if (childCount < 80) {
		    c += 'medium';
		} else {
		    c += 'large';
		}
		markers.on('clusterclick', function (a) {
		    console.log('cluster ' + a.layer.getAllChildMarkers()[1]);

		});
		return new L.DivIcon({ html: '<div><span><b>' + childCount + '</b></span></div>',      className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });	    }
	});
    map.addLayer(editableLayers);
    map.addLayer(markers);

    var options = {
        position: 'topright',
        draw: {
            polyline: false,
            polygon: false,
            circle: false, // Turns off this drawing tool
            rectangle: {
            },
            marker: false
        },
        edit: {
            featureGroup: editableLayers, //REQUIRED!!
            edit: {
                selectedPathOptions: {
                    maintainColor: true,
                    opacity: 0.3
                }
            },
            remove: {
            }
        }
    };

    // Initialise the draw control and pass it the FeatureGroup of editable layers
    var drawControl = new L.Control.Draw(options);
    map.addControl(drawControl);

    map.on('draw:created', function(drawEvt) {
        var type = drawEvt.layerType,
            layer = drawEvt.layer;
        // fill in part of the feature
        layer.feature = {
            type: 'Feature',
            properties: {
                startDate: moment().add(-1, 'weeks').toJSON(),
                endDate: moment().add(1, 'weeks').toJSON(),
                incidentId: uuid()
            }
        };
        var geojson = layer.toGeoJSON();

        console.log('created', geojson);
        layer.on('click', function(evt) {
            console.log('click', evt);
            if (map.properties.editing || map.properties.deleting) {
                return;
            }
            $('#startDate').data('DateTimePicker').date(moment(layer.feature.properties.startDate));
            $('#endDate').data('DateTimePicker').date(moment(layer.feature.properties.endDate));
            $('#modal-form').data(layer);
            $('#modal-form').modal({});
        });
        // Do whatever else you need to. (save to db, add to map etc)
        editableLayers.addLayer(layer);
    });

    map.on('draw:edited', function(e) {
        var layers = e.layers;
        layers.eachLayer(function(layer) {
            //do whatever you want, most likely save back to db
            var geojson = layer.toGeoJSON();
            console.log('edited', geojson);

        });
    });
    map.on('draw:deletestart', function(e) {
        console.log('about to delete', e);
        map.properties.deleting = true;
    });
    map.on('draw:editstart', function(e) {
        console.log('about to edit');
        map.properties.editing = true;
    });
    map.on('draw:deletestop', function(e) {
        console.log('no more deletes', e);
        map.properties.deleting = false;
    });
    map.on('draw:editstop', function(e) {
        console.log('no more edits');
        map.properties.editing = false;
    });
    map.on('draw:deleted', function(e) {
        var layers = e.layers;
        layers.eachLayer(function(layer) {
            //do whatever you want, most likely save back to db
            var geojson = layer.toGeoJSON();
            console.log('deleted', geojson);

        });
    });
    
    eventmarker.on('click', function(){
        map.setZoom(7);
        map.panto(eventmarker._latlngs)
    });

}

