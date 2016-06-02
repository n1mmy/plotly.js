/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var convert = require('./convert');


function ScatterMapbox(mapbox, uid) {
    this.mapbox = mapbox;
    this.map = mapbox.map;

    this.uid = uid;

    this.idSourceFill = uid + '-source-fill';
    this.idSourceLines = uid + '-source-lines';
    this.idSourceMarkers = uid + '-source-markers';

    this.idLayerFill = uid + '-layer-fill';
    this.idLayerLines = uid + '-layer-lines';
    this.idLayerMarkers = uid + '-layer-markers';

    this.sourceFill = mapbox.createGeoJSONSource();
    this.map.addSource(this.idSourceFill, this.sourceFill);

    this.sourceLines = mapbox.createGeoJSONSource();
    this.map.addSource(this.idSourceLines, this.sourceLines);

    this.sourceMarkers = mapbox.createGeoJSONSource();
    this.map.addSource(this.idSourceMarkers, this.sourceMarkers);

    this.map.addLayer({
        id: this.idLayerFill,
        source: this.idSourceFill,
        type: 'fill'
    });

    this.map.addLayer({
        id: this.idLayerLines,
        source: this.idSourceLines,
        type: 'line'
    });

    this.map.addLayer({
        id: this.idLayerMarkers,
        source: this.idSourceMarkers,
        type: 'circle'
    });

    // how to add 'symbol' layer ???
    // https://www.mapbox.com/mapbox-gl-js/example/geojson-markers/
    //
    // which appear to support arrayOk attributes
}

var proto = ScatterMapbox.prototype;

proto.update = function update(trace) {
    var map = this.map,
        opts = convert(trace);

    setOptions(map, this.idLayerFill, 'setLayoutProperty', opts.fill.layout);
    setOptions(map, this.idLayerLines, 'setLayoutProperty', opts.lines.layout);
    setOptions(map, this.idLayerMarkers, 'setLayoutProperty', opts.markers.layout);

    if(isVisible(opts.fill)) {
        this.sourceFill.setData(opts.fill.geojson);
        setOptions(map, this.idLayerFill, 'setPaintProperty', opts.fill.paint);
    }

    if(isVisible(opts.lines)) {
        this.sourceLines.setData(opts.lines.geojson);
        setOptions(map, this.idLayerLines, 'setPaintProperty', opts.lines.paint);
    }

    if(isVisible(opts.markers)) {
        this.sourceMarkers.setData(opts.markers.geojson);
        setOptions(map, this.idLayerMarkers, 'setPaintProperty', opts.markers.paint);
    }
};

proto.dispose = function dispose() {
    var map = this.map;

    map.removeLayer(this.idLayerFill);
    map.removeLayer(this.idLayerLines);
    map.removeLayer(this.idLayerMarkers);

    map.removeSource(this.idSourceLines);
    map.removeSource(this.idSourceMarkers);
};

function setOptions(map, id, methodName, opts) {
    var keys = Object.keys(opts);

    for(var i = 0; i < keys.length; i++) {
        var key = keys[i];

        map[methodName](id, key, opts[key]);
    }
}

function isVisible(layerOpts) {
    return layerOpts.layout.visibility === 'visible';
}

module.exports = function createScatterMapbox(mapbox, trace) {
    var scatterMapbox = new ScatterMapbox(mapbox, trace.uid);
    scatterMapbox.update(trace);

    return scatterMapbox;
};
