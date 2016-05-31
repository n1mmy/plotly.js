/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var mapboxgl = require('mapbox-gl');

var Fx = require('../cartesian/graph_interact');
var constants = require('./constants');


function Mapbox(opts) {
    this.id = opts.id;
    this.gd = opts.gd;
    this.container = opts.container;
    this.isStatic = opts.staticPlot;

    var fullLayout = opts.fullLayout;

    // unique id for this Mapbox instance
    this.uid = fullLayout._uid + '-' + this.id;

    // full mapbox options (N.B. needs to be updated on every updates)
    this.opts = fullLayout[this.id];

    // create framework on instantiation for a smoother first plot call
    this.div = null;
    this.xaxis = null;
    this.yaxis = null;
    this.createFramework(fullLayout);

    this.map = null;
    this.traceHash = {};
}

var proto = Mapbox.prototype;

module.exports = function createMapbox(opts) {
    var mapbox = new Mapbox(opts);

    return mapbox;
};

proto.plot = function(fullData, fullLayout, promises) {
    var self = this;

    // feed in new mapbox options
    self.opts = fullLayout[this.id];

    var promise;

    if(!self.map) {
        promise = new Promise(function(resolve) {
            self.createMap(fullData, fullLayout, resolve);
        });
    }
    else {
        promise = new Promise(function(resolve) {
            self.updateMap(fullData, fullLayout, resolve);
        });
    }

    promises.push(promise);
};

proto.createMap = function(fullData, fullLayout, resolve) {
    var self = this,
        gd = self.gd,
        opts = self.opts;

    var map = self.map = new mapboxgl.Map({
        container: self.div,

        style: convertStyleUrl(opts.style),
        center: convertCenter(opts.center),
        zoom: opts.zoom,
        bearing: opts.bearing,
        pitch: opts.pitch,

        interactive: !self.isStatic,
        preserveDrawingBuffer: self.isStatic
    });

    map.once('load', function() {
        self.updateData(fullData);
        self.updateLayout(fullLayout);

        map.on('render', function() {
            if(map.loaded()) {
                map.off('render', this);
                resolve();
            }
        });
    });

    // keep track of pan / zoom in user layout
    map.on('move', function() {
        var center = map.getCenter();
        opts._input.center = opts.center = { lon: center.lng, lat: center.lat };
        opts._input.zoom = opts.zoom = map.getZoom();
    });

    map.on('mousemove', function(evt) {
        var bb = self.div.getBoundingClientRect();

        // some hackery to get Fx.hover to work

        evt.clientX = evt.point.x + bb.left;
        evt.clientY = evt.point.y + bb.top;

        evt.target.getBoundingClientRect = function() { return bb; };

        self.xaxis.p2c = function() { return evt.lngLat.lng; };
        self.yaxis.p2c = function() { return evt.lngLat.lat; };

        Fx.hover(gd, evt, self.id);
    });

    function unhover() {
        Fx.loneUnhover(fullLayout._toppaper);
    }

    map.on('dragstart', unhover);
    map.on('zoomstart', unhover);
};

proto.updateMap = function(fullData, fullLayout, resolve) {
    var self = this,
        map = self.map;

    var currentStyle = self.getStyle(),
        style = self.opts.style;

    if(style !== currentStyle) {
        map.setStyle(convertStyleUrl(style));

        map.style.once('load', function() {

            // need to rebuild trace layers on reload
            // to avoid 'lost event' errors
            self.traceHash = {};

            self.updateData(fullData);
            self.updateLayout(fullLayout);
            resolve();
        });
    }
    else {
        self.updateData(fullData);
        self.updateLayout(fullLayout);
        resolve();
    }
};

proto.updateData = function(fullData) {
    var traceHash = this.traceHash;
    var traceObj, i, j;

    // update or create trace objects
    for(i = 0; i < fullData.length; i++) {
        var trace = fullData[i];
        traceObj = traceHash[trace.uid];

        if(traceObj) traceObj.update(trace);
        else {
            traceHash[trace.uid] = trace._module.plot(this, trace);
        }
    }

    // remove empty trace objects
    var ids = Object.keys(traceHash);
    id_loop:
    for(i = 0; i < ids.length; i++) {
        var id = ids[i];

        for(j = 0; j < fullData.length; j++) {
            if(id === fullData[j].uid) continue id_loop;
        }

        traceObj = traceHash[id];
        traceObj.dispose();
        delete traceHash[id];
    }
};

proto.updateLayout = function(fullLayout) {
    var map = this.map,
        opts = this.opts;

    map.setCenter(convertCenter(opts.center));
    map.setZoom(opts.zoom);
    map.setBearing(opts.bearing);
    map.setPitch(opts.pitch);

    // TODO update layers

    this.updateFramework(fullLayout);
    this.map.resize();
};

proto.createFramework = function(fullLayout) {
    var self = this;

    var div = self.div = document.createElement('div');

    div.id = self.uid;
    div.style.position = 'absolute';

    self.container.appendChild(div);

    // create mock x/y axes for hover routine

    self.xaxis = {
        _id: 'x',
        c2p: function(v) { return self.project(v).x; }
    };

    self.yaxis = {
        _id: 'y',
        c2p: function(v) { return self.project(v).y; }
    };

    self.updateFramework(fullLayout);
};

proto.updateFramework = function(fullLayout) {
    var domain = fullLayout[this.id].domain,
        size = fullLayout._size;

    var style = this.div.style;

    // TODO Is this correct? It seems to get the map zoom level wrong?

    style.width = size.w * (domain.x[1] - domain.x[0]) + 'px';
    style.height = size.h * (domain.y[1] - domain.y[0]) + 'px';
    style.left = size.l + domain.x[0] * size.w + 'px';
    style.top = size.t + (1 - domain.y[1]) * size.h + 'px';

    this.xaxis._offset = size.l + domain.x[0] * size.w;
    this.xaxis._length = size.w * (domain.x[1] - domain.x[0]);

    this.yaxis._offset = size.t + (1 - domain.y[1]) * size.h;
    this.yaxis._length = size.h * (domain.y[1] - domain.y[0]);
};

proto.destroy = function() {
    this.map.remove();
    this.container.removeChild(this.div);
};

proto.toImage = function() {
    return this.map.getCanvas().toDataURL();
};

proto.getStyle = function() {
    var name = this.map.getStyle().name;

    return name
        .replace('Mapbox ', '')
        .replace(' ', '-')
        .toLowerCase();
};

// convenience wrapper to create blank GeoJSON sources
// and avoid 'invalid GeoJSON' errors
proto.createGeoJSONSource = function() {
    var blank = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: []
        }
    };

    return new mapboxgl.GeoJSONSource({data: blank});
};

// convenience method to project a [lon, lat] array to pixel coords
proto.project = function(v) {
    return this.map.project(new mapboxgl.LngLat(v[0], v[1]));
};

function convertStyleUrl(style) {
    return constants.styleUrlPrefix + style + '-' + constants.styleUrlSuffix;
}

function convertCenter(center) {
    return [center.lon, center.lat];
}
