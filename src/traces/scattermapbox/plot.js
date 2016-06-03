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
    this.idSourceLine = uid + '-source-line';
    this.idSourceCircle = uid + '-source-circle';
    this.idSourceSymbol = uid + '-source-symbol';

    this.idLayerFill = uid + '-layer-fill';
    this.idLayerLine = uid + '-layer-line';
    this.idLayerCircle = uid + '-layer-circle';
    this.idLayerSymbol = uid + '-layer-symbol';

    this.sourceFill = mapbox.createGeoJSONSource();
    this.map.addSource(this.idSourceFill, this.sourceFill);

    this.sourceLine = mapbox.createGeoJSONSource();
    this.map.addSource(this.idSourceLine, this.sourceLine);

    this.sourceCircle = mapbox.createGeoJSONSource();
    this.map.addSource(this.idSourceCircle, this.sourceCircle);

    this.sourceSymbol = mapbox.createGeoJSONSource();
    this.map.addSource(this.idSourceSymbol, this.sourceSymbol);

    this.map.addLayer({
        id: this.idLayerFill,
        source: this.idSourceFill,
        type: 'fill'
    });

    this.map.addLayer({
        id: this.idLayerLine,
        source: this.idSourceLine,
        type: 'line'
    });

    this.map.addLayer({
        id: this.idLayerCircle,
        source: this.idSourceCircle,
        type: 'circle'
    });

    this.map.addLayer({
        id: this.idLayerSymbol,
        source: this.idSourceSymbol,
        type: 'symbol'
    });

    // We could merge the 'fill' source with the 'line' source and
    // the 'circle' source with the 'symbol' source if ever having
    // for up-to 4 sources per 'scattermapbox' traces becomes a problem.
}

var proto = ScatterMapbox.prototype;

proto.update = function update(calcTrace) {
    var map = this.map;

    var opts = convert(calcTrace);

    setOptions(map, this.idLayerFill, 'setLayoutProperty', opts.fill.layout);
    setOptions(map, this.idLayerLine, 'setLayoutProperty', opts.line.layout);
    setOptions(map, this.idLayerCircle, 'setLayoutProperty', opts.circle.layout);
    setOptions(map, this.idLayerSymbol, 'setLayoutProperty', opts.symbol.layout);

    if(isVisible(opts.fill)) {
        this.sourceFill.setData(opts.fill.geojson);
        setOptions(map, this.idLayerFill, 'setPaintProperty', opts.fill.paint);
    }

    if(isVisible(opts.line)) {
        this.sourceLine.setData(opts.line.geojson);
        setOptions(map, this.idLayerLine, 'setPaintProperty', opts.line.paint);
    }

    if(isVisible(opts.circle)) {
        this.sourceCircle.setData(opts.circle.geojson);
        setOptions(map, this.idLayerCircle, 'setPaintProperty', opts.circle.paint);
    }

    if(isVisible(opts.symbol)) {
        this.sourceSymbol.setData(opts.symbol.geojson);
        setOptions(map, this.idLayerSymbol, 'setPaintProperty', opts.symbol.paint);
    }
};

proto.dispose = function dispose() {
    var map = this.map;

    map.removeLayer(this.idLayerFill);
    map.removeLayer(this.idLayerLine);
    map.removeLayer(this.idLayerCircle);
    map.removeLayer(this.idLayerSymbol);

    map.removeSource(this.idSourceFill);
    map.removeSource(this.idSourceLine);
    map.removeSource(this.idSourceCircle);
    map.removeSource(this.idSourceSymbol);
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

module.exports = function createScatterMapbox(mapbox, calcTrace) {
    var trace = calcTrace[0].trace;

    var scatterMapbox = new ScatterMapbox(mapbox, trace.uid);
    scatterMapbox.update(calcTrace);

    return scatterMapbox;
};
