/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var Lib = require('../../lib');

var handleSubplotDefaults = require('../subplot_defaults');
var layoutAttributes = require('./layout_attributes');


module.exports = function supplyLayoutDefaults(layoutIn, layoutOut, fullData) {
    handleSubplotDefaults(layoutIn, layoutOut, fullData, {
        type: 'mapbox',
        attributes: layoutAttributes,
        handleDefaults: handleDefaults,
        partition: 'y'
    });
};

function handleDefaults(containerIn, containerOut, coerce) {
    coerce('style');
    coerce('center.lon');
    coerce('center.lat');
    coerce('zoom');
    coerce('bearing');
    coerce('pitch');

    handleLayerDefaults(containerIn, containerOut);

    containerOut._input = containerIn;
}

function handleLayerDefaults(containerIn, containerOut) {
    var layersIn = containerIn.layers || [],
        layersOut = containerOut.layers = [];

    var layerIn, layerOut;

    function coerce(attr, dflt) {
        return Lib.coerce(layerIn, layerOut, layoutAttributes.layers, attr, dflt);
    }

    for(var i = 0; i < layersIn.length; i++) {
        layerIn = layersIn[i];
        layerOut = {};

        coerce('sourcetype')
        coerce('source')

        var type = coerce('type');

        if(type === 'line') {
            coerce('line.color');
            coerce('line.width');
            coerce('line.dash');
            coerce('fillcolor');
        }

        coerce('below');
        coerce('opacity');

        layersOut.push(layerOut);
    }
}
