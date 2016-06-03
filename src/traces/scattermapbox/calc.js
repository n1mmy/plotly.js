/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var Lib = require('../../lib');
var arrayToCalcItem = require('../../lib/array_to_calc_item');
var hasColorscale = require('../../components/colorscale/has_colorscale');
var makeColorScaleFn = require('../../components/colorscale/make_scale_function');
var subtypes = require('../scatter/subtypes');
var calcMarkerColorscale = require('../scatter/marker_colorscale_calc');
var makeBubbleSizeFn = require('../scatter/make_bubble_size_func');


module.exports = function calc(gd, trace) {
    var len = trace.lon.length,
        marker = trace.marker,
        hasMarkers = subtypes.hasMarkers(trace);

    calcMarkerColorscale(trace);

    var colorFn = hasColorscale(trace, 'marker') ?
            makeColorScaleFn(marker.colorscale, marker.cmin, marker.cmax) :
            Lib.identity;

    var sizeFn = subtypes.isBubble(trace) ?
            makeBubbleSizeFn(trace) :
            Lib.identity;

    var cd = new Array(len);

    for(var i = 0; i < len; i++) {
        var cdi = cd[i] = {};

        // the isNumeric check is done in the convert step

        cdi.lonlat = [trace.lon[i], trace.lat[i]];

        if(hasMarkers) {
            arrayToCalcItem(marker.color, cdi, 'mc', i);
            arrayToCalcItem(marker.size, cdi, 'ms', i);
            arrayToCalcItem(marker.symbol, cdi, 'mx', i);

            if(cdi.mc !== undefined) cdi.mcc = colorFn(cdi.mc);
            if(cdi.ms !== undefined) cdi.mrc = sizeFn(cdi.ms);
        }

        arrayToCalcItem(trace.text, cdi, 'tx', i);
    }

    return cd;
};
