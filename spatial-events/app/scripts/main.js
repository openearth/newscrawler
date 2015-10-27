/* global addMap */
/* jshint devel:true */
'use strict';

addMap();
// submit form
$(function () {
    $('#startDate').datetimepicker();
    $('#endDate').datetimepicker();
    $('#save').click(function(){
        // store data
        $('#modal-form').modal('hide');
        // get variables from the form
        var layer = $('#modal-form').data();
        var properties = layer.feature.properties;
        properties.startDate = $('#startDate').data('DateTimePicker').date().toJSON();
        properties.endDate = $('#endDate').data('DateTimePicker').date().toJSON();
        properties.tags = $('#tags').val();
        var geojson = layer.toGeoJSON();
        console.log('geojson', geojson);
        var event = new CustomEvent('incident', {'detail': geojson});
        document.dispatchEvent(event);
    });
});
