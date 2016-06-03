/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var isNumeric = require('fast-isnumeric');

var Lib = require('../../lib');
var subTypes = require('../scatter/subtypes');
var makeBubbleSizeFn = require('../scatter/make_bubble_size_func');
var hasColorscale = require('../../components/colorscale/has_colorscale');
var makeColorScaleFn = require('../../components/colorscale/make_scale_function');

var COLOR_PROP = 'circle-color';
var SIZE_PROP = 'circle-radius';


module.exports = function convert(trace) {
    var isVisible = (trace.visible === true),
        hasFill = (trace.fill !== 'none'),
        hasLines = subTypes.hasLines(trace),
        hasMarkers = subTypes.hasMarkers(trace),
        hasText = subTypes.hasText(trace),
        hasCircles = (hasMarkers && trace.marker.symbol === 'circle');

    var fill = initContainer(),
        line = initContainer(),
        circle = initContainer(),
        symbol = initContainer();

    var opts = {
        fill: fill,
        line: line,
        circle: circle,
        symbol: symbol
    };

    // early return is not visible
    if(!isVisible) return opts;

    // fill layer and line layer use the same coords
    var coords;
    if(hasFill || hasLines) {
        coords = getCoords(trace);
    }

    if(hasFill) {
        fill.geojson = makeFillGeoJSON(trace, coords);
        fill.layout.visibility = 'visible';

        Lib.extendFlat(fill.paint, {
            'fill-color': trace.fillcolor
        });
    }

    if(hasLines) {
        line.geojson = makeLineGeoJSON(trace, coords);
        line.layout.visibility = 'visible';

        Lib.extendFlat(line.paint, {
            'line-width': trace.line.width,
            'line-color': trace.line.color,
            'line-opacity': trace.opacity
        });

        // TODO convert line.dash into line-dasharray
    }

    if(hasCircles) {
        var hash = {};
        hash[COLOR_PROP] = {};
        hash[SIZE_PROP] = {};

        circle.geojson = makeCircleGeoJSON(trace, hash);
        circle.layout.visibility = 'visible';

        Lib.extendFlat(circle.paint, {
            'circle-opacity': trace.opacity * trace.marker.opacity,
            'circle-color': calcCircleColor(trace, hash),
            'circle-radius': calcCircleRadius(trace, hash)
        });
    }

    if(!hasCircles || hasText) {
        symbol.geojson = makeSymbolGeoJSON(trace);

        Lib.extendFlat(symbol.layout, {
            visibility: 'visible',
            'icon-image': '{symbol}-15',
            'text-field': '{text}'
        });

        if(hasMarkers) {
            Lib.extendFlat(symbol.layout, {
                'icon-size': trace.marker.size / 10
            });

            Lib.extendFlat(symbol.paint, {
                'icon-opacity': trace.opacity * trace.marker.opacity,

                // TODO does not work ??
                'icon-color': trace.marker.color
            });
        }

        if(hasText) {
            var textOpts = calcTextOpts(trace);

            Lib.extendFlat(symbol.layout, {
                'text-font': trace.textfont.textfont,
                'text-size': trace.textfont.size,
                'text-anchor': textOpts.anchor,
                'text-offset': textOpts.offset
            });

            Lib.extendFlat(symbol.paint, {
                'text-color': trace.textfont.color,
                'text-opacity': trace.opacity
            });
        }
    }

    return opts;
};

function initContainer() {
    return {
        geojson: makeBlankGeoJSON(),
        layout: { visibility: 'none' },
        paint: {}
    };
}

function makeBlankGeoJSON() {
    return {
        type: 'Point',
        coordinates: []
    };
}

function makeFillGeoJSON(trace, coords) {
    return {
        type: 'Polygon',
        coordinates: coords
    };
}

function makeLineGeoJSON(trace, coords) {
    return {
        type: 'MultiLineString',
        coordinates: coords
    };
}

// N.B. `hash` is mutated here
function makeCircleGeoJSON(trace, hash) {
    var marker = trace.marker,
        len = getCoordLen(trace),
        hasColorArray = Array.isArray(marker.color),
        hasSizeArray = Array.isArray(marker.size);

    // translate vals in trace arrayOk containers
    // into a val-to-index hash object
    function translate(props, key, cont, index) {
        var value = cont[index];

        if(!hash[key][value]) hash[key][value] = index;

        props[key] = hash[key][value];
    }

    var features = [];

    for(var i = 0; i < len; i++) {
        var lon = trace.lon[i],
            lat = trace.lat[i];

        var props = {};
        if(hasColorArray) translate(props, COLOR_PROP, marker.color, i);
        if(hasSizeArray) translate(props, SIZE_PROP, marker.size, i);

        if(checkLonLat(lon, lat)) {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [+lon, +lat]
                },
                properties: props
            });
        }
    }

    return {
        type: 'FeatureCollection',
        features: features
    };
}

function makeSymbolGeoJSON(trace) {
    var marker = trace.marker || {},
        symbol = marker.symbol,
        text = trace.text,
        len = getCoordLen(trace);

    var fillSymbol = (symbol !== 'circle') ?
            getFillFunc(symbol) :
            blankFillFunc;

    var fillText = subTypes.hasText(trace) ?
            getFillFunc(text) :
            blankFillFunc;

    var features = [];

    for(var i = 0; i < len; i++) {
        var lon = trace.lon[i],
            lat = trace.lat[i];

        if(checkLonLat(lon, lat)) {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [+lon, +lat]
                },
                properties: {
                    symbol: fillSymbol(symbol, i),
                    text: fillText(text, i)
                }
            });
        }
    }

    return {
        type: 'FeatureCollection',
        features: features
    };
}

function calcCircleColor(trace, hash) {
    var marker = trace.marker;
    var out;

    if(Array.isArray(marker.color)) {
        var colorFn = hasColorscale(trace, 'marker') ?
                makeColorScaleFn(marker.colorscale, marker.cmin, marker.cmax) :
                Lib.identity;

        var vals = Object.keys(hash[COLOR_PROP]),
            stops = [];

        for(var i = 0; i < vals.length; i++) {
            var val = vals[i];

            stops.push([ hash[COLOR_PROP][val], colorFn(val) ]);
        }

        out = {
            property: SIZE_PROP,
            stops: stops
        };

    }
    else {
        out = marker.color;
    }

    return out;
}

function calcCircleRadius(trace, hash) {
    var marker = trace.marker;
    var out;

    if(Array.isArray(marker.size)) {
        var sizeFn = makeBubbleSizeFn(trace);

        var vals = Object.keys(hash[SIZE_PROP]),
            stops = [];

        for(var i = 0; i < vals.length; i++) {
            var val = vals[i];

            stops.push([ hash[SIZE_PROP][val], sizeFn(val) ]);
        }

        // stops indices must be sorted
        stops.sort(function(a, b) {
            return a[0] - b[0];
        });

        out = {
            property: SIZE_PROP,
            stops: stops
        };
    }
    else {
        out = marker.size / 2;
    }

    return out;
}

function calcTextOpts(trace) {
    var textposition = trace.textposition,
        parts = textposition.split(' '),
        vPos = parts[0],
        hPos = parts[1];

    // ballpack values
    var ms = (trace.marker || {}).size,
        xInc = 0.5 + (ms / 15),
        yInc = 1.5 + (ms / 15);

    var anchorVals = ['', ''],
        offset = [0, 0];

    switch(vPos) {
        case 'top':
            anchorVals[0] = 'top';
            offset[1] = -yInc;
            break;
        case 'bottom':
            anchorVals[0] = 'bottom';
            offset[1] = yInc;
            break;
    }

    switch(hPos) {
        case 'left':
            anchorVals[1] = 'right';
            offset[0] = -xInc;
            break;
        case 'right':
            anchorVals[1] = 'left';
            offset[0] = xInc;
            break;
    }

    // Mapbox text-anchor must be one of:
    //  center, left, right, top, bottom,
    //  top-left, top-right, bottom-left, bottom-right

    var anchor;
    if(anchorVals[0] && anchorVals[1]) anchor = anchorVals.join('-');
    else if(anchorVals[0]) anchor = anchorVals[0];
    else if(anchorVals[1]) anchor = anchorVals[1];
    else anchor = 'center';

    return { anchor: anchor, offset: offset };
}

function checkLonLat(lon, lat) {
    return isNumeric(lon) && isNumeric(lat);
}

// lon and lat have the same length after the defaults step
function getCoordLen(trace) {
    return trace.lon.length;
}

function getCoords(trace) {
    var len = getCoordLen(trace),
        connectgaps = trace.connectgaps;

    var coords = [],
        lineString = [];

    for(var i = 0; i < len; i++) {
        var lon = trace.lon[i],
            lat = trace.lat[i];

        if(checkLonLat(lon, lat)) {
            lineString.push([+lon, +lat]);
        }
        else if(!connectgaps && lineString.length > 0) {
            coords.push(lineString);
            lineString = [];
        }
    }

    coords.push(lineString);

    return coords;
}

function getFillFunc(attr) {
    if(Array.isArray(attr)) {
        return function(arr, i) { return arr[i]; };
    }
    else if(attr) {
        return function(v) { return v; };
    }
    else {
        return blankFillFunc;
    }
}

function blankFillFunc() { return ''; }
