/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var lineAttrs = require('../../traces/scatter/attributes').line;


module.exports = {
    domain: {
        x: {
            valType: 'info_array',
            role: 'info',
            items: [
                {valType: 'number', min: 0, max: 1},
                {valType: 'number', min: 0, max: 1}
            ],
            dflt: [0, 1],
            description: [
                'Sets the horizontal domain of this subplot',
                '(in plot fraction).'
            ].join(' ')
        },
        y: {
            valType: 'info_array',
            role: 'info',
            items: [
                {valType: 'number', min: 0, max: 1},
                {valType: 'number', min: 0, max: 1}
            ],
            dflt: [0, 1],
            description: [
                'Sets the vertical domain of this subplot',
                '(in plot fraction).'
            ].join(' ')
        }
    },

    style: {
        valType: 'enumerated',
        values: ['basic', 'streets', 'outdoors', 'light', 'dark', 'satellite', 'satellite-streets'],
        dflt: 'basic',
        description: [
            ''
        ].join(' ')
    },
    center: {
        lon: {
            valType: 'number',
            dflt: 0
        },
        lat: {
            valType: 'number',
            dflt: 0
        }
    },
    zoom: {
        valType: 'number',
        dflt: 1
    },
    bearing: {
        valType: 'number',
        dflt: 0
    },
    pitch: {
        valType: 'number',
        dflt: 0
    },

    layers: {
        _isLinkedToArray: true,

        description: [
            ''
        ].join(' '),

        sourcetype: {
            valType: 'enumerated',
            values: ['geojson', /* 'vector', 'raster', 'image', 'video' */],
            dflt: 'geojson'
        },
        source: {
            valType: 'any',
        },

        type: {
            valType: 'enumerated',
            values: ['line', /* 'background', 'symbol', 'raster', 'circle' */ ],
            dflt: 'line',
            role: 'info'
        },

        below: {
            valType: 'string',
            dflt: '',
            role: 'info',
            description: [
                'If a value for before is provided, the layer will be inserted',
                'before the layer with the specified ID. If before is omitted,',
                'the layer will be inserted above every existing layer.'
            ].join(' ')
        },

        line: {
            color: lineAttrs.color,
            width: lineAttrs.width,
            dash: lineAttrs.dash
        },

        fillcolor: {
            valType: 'color',
            dflt: 'rgba(0,0,0,0)',
            role: 'info',
            description: [
                'Sets the color filling the layer\'s interior.'
            ].join(' ')
        },

        opacity: {
            valType: 'number',
            min: 0,
            max: 1,
            dflt: 1,
            role: 'info',
            description: 'Sets the opacity of the layer.'
        }
    }

};
