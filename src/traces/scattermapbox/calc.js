/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var subtypes = require('../scatter/subtypes');
var arrayToCalcItem = require('../../lib/array_to_calc_item');
var calcMarkerColorscale = require('../scatter/marker_colorscale_calc');


module.exports = function calc(gd, trace) {
    var len = trace.lon.length,
        hasMarkers = subtypes.hasMarkers(trace);

    var cd = new Array(len);

    for(var i = 0; i < len; i++) {
        var cdi = cd[i] = {};

        cdi.lonlat = [trace.lon[i], trace.lat[i]];

        if(hasMarkers) {
            var marker = trace.marker;

            arrayToCalcItem(marker.color, cdi, 'mc', i);
            arrayToCalcItem(marker.size, cdi, 'ms', i);

            // TODO handle these for hover !!!
            // arrayToCalcItem(colorScaleFn(marker.color), cdi, 'mcc', i);
            // arrayToCalcItem(sizFn(marker.size), cdi, 'mrc', i);
        }

        arrayToCalcItem(trace.text, cdi, 'tx', i);
    }

    calcMarkerColorscale(trace);

    return cd;
};
