var Plotly = require('@lib');
var Lib = require('@src/lib');

// var supplyLayoutDefaults = require('@src/plots/mapbox/layout_defaults');

var d3 = require('d3');
var createGraphDiv = require('../assets/create_graph_div');
var destroyGraphDiv = require('../assets/destroy_graph_div');
var mouseEvent = require('../assets/mouse_event');
var customMatchers = require('../assets/custom_matchers');

var noop = function() {};


describe('mapbox defaults', function() {
    'use strict';

//     var layoutIn, layoutOut, fullData;
});

describe('mapbox plots', function() {
    'use strict';

    var mock = require('@mocks/mapbox_0.json'),
        gd;

    var pointPos = [579, 276],
        blankPos = [650, 120];

    beforeAll(function() {
        jasmine.addMatchers(customMatchers);
    });

    beforeEach(function(done) {
        gd = createGraphDiv();

        var mockCopy = Lib.extendDeep({}, mock);

        Plotly.plot(gd, mockCopy.data, mockCopy.layout).then(done);
    });

    afterEach(function() {
        Plotly.purge(gd);
        destroyGraphDiv();
    });

    it('should be able to toggle trace visibility', function(done) {
        var modes = ['lines', 'markers'];

        expect(countVisibleTraces(gd, modes)).toEqual(2);

        Plotly.restyle(gd, 'visible', false).then(function() {
            expect(gd._fullLayout.mapbox).toBeUndefined();

            return Plotly.restyle(gd, 'visible', true);
        }).then(function() {
            expect(countVisibleTraces(gd, modes)).toEqual(2);

            return Plotly.restyle(gd, 'visible', 'legendonly', [1]);
        }).then(function() {
            expect(countVisibleTraces(gd, modes)).toEqual(1);

            return Plotly.restyle(gd, 'visible', true);
        }).then(function() {
            expect(countVisibleTraces(gd, modes)).toEqual(2);

            done();
        });
    });

    it('should be able to delete and add traces', function(done) {
        var modes = ['lines', 'markers'];

        expect(countVisibleTraces(gd, modes)).toEqual(2);

        Plotly.deleteTraces(gd, [0]).then(function() {
            expect(countVisibleTraces(gd, modes)).toEqual(1);

            var trace = Lib.extendDeep({}, mock.data[0]);

            return Plotly.addTraces(gd, [trace]);
        }).then(function() {
            expect(countVisibleTraces(gd, modes)).toEqual(2);

            var trace = {
                type: 'scattermapbox',
                mode: 'markers+lines',
                lon: [10, 20, 10],
                lat: [10, -20, 10]
            };

            return Plotly.addTraces(gd, [trace]);
        }).then(function() {
            expect(countVisibleTraces(gd, modes)).toEqual(3);

            return Plotly.deleteTraces(gd, [0, 1, 2]);
        }).then(function() {
            expect(gd._fullLayout.mapbox).toBeUndefined();

            done();
        });
    });

    it('should be able to restyle', function(done) {
        function assertMarkerColor(expectations) {
            var TRANSITION_DELAY = 500;

            return new Promise(function(resolve) {
                setTimeout(function() {
                    var colors = getStyle(gd, 'markers', 'circle-color');

                    expectations.forEach(function(expected, i) {
                        expect(colors[i]).toBeCloseToArray(expected);
                    });

                    resolve();
                }, TRANSITION_DELAY);
            });
        }

        assertMarkerColor([
            [0.121, 0.466, 0.705, 1],
            [1, 0.498, 0.0549, 1]
        ])
        .then(function() {
            return Plotly.restyle(gd, 'marker.color', 'green');
        })
        .then(function() {
            return assertMarkerColor([
                [0, 0.5019, 0, 1],
                [0, 0.5019, 0, 1]
            ]);
        })
        .then(function() {
            return Plotly.restyle(gd, 'marker.color', 'red', [1]);
        })
        .then(function() {
            return assertMarkerColor([
                [0, 0.5019, 0, 1],
                [1, 0, 0, 1]
            ]);
        })
        .then(done);
    });

    it('should be able to relayout', function(done) {
        function assertLayout(style, center, zoom, dims) {
            var mapInfo = getMapInfo(gd);

            expect(mapInfo.style.name).toEqual(style);
            expect([mapInfo.center.lng, mapInfo.center.lat])
                .toBeCloseToArray(center);
            expect(mapInfo.zoom).toBeCloseTo(zoom);

            var divStyle = mapInfo.div.style;
            var expectedDims = ['left', 'top', 'width', 'height'].map(function(p) {
                return parseFloat(divStyle[p]);
            });

            expect(expectedDims).toBeCloseToArray(dims);
        }

        assertLayout('Mapbox Dark', [-4.710, 19.475], 1.234, [80, 100, 908, 270]);

        Plotly.relayout(gd, 'mapbox.center', { lon: 0, lat: 0 }).then(function() {
            assertLayout('Mapbox Dark', [0, 0], 1.234, [80, 100, 908, 270]);

            return Plotly.relayout(gd, 'mapbox.zoom', '6');
        }).then(function() {
            assertLayout('Mapbox Dark', [0, 0], 6, [80, 100, 908, 270]);

            return Plotly.relayout(gd, 'mapbox.style', 'light');
        }).then(function() {
            assertLayout('Mapbox Light', [0, 0], 6, [80, 100, 908, 270]);

            return Plotly.relayout(gd, 'mapbox.domain.x', [0, 0.5]);
        }).then(function() {
            assertLayout('Mapbox Light', [0, 0], 6, [80, 100, 454, 270]);

            return Plotly.relayout(gd, 'mapbox.domain.y[0]', 0.5);
        }).then(function() {
            assertLayout('Mapbox Light', [0, 0], 6, [80, 100, 454, 135]);

            done();
        });
    });

    it('should be able to update traces', function(done) {
        function assertDataPts(lengths) {
            var lines = getGeoJsonData(gd, 'lines'),
                markers = getGeoJsonData(gd, 'markers');

            lines.forEach(function(obj, i) {
                expect(obj.coordinates[0].length).toEqual(lengths[i]);
            });

            markers.forEach(function(obj, i) {
                expect(obj.features.length).toEqual(lengths[i]);
            });
        }

        assertDataPts([3, 3]);

        var update = {
            lon: [[10, 20]],
            lat: [[-45, -20]]
        };

        Plotly.restyle(gd, update, [1]).then(function() {
            assertDataPts([3, 2]);

            var update = {
                lon: [ [10, 20], [30, 40, 20] ],
                lat: [ [-10, 20], [10, 20, 30] ]
            };

            return Plotly.extendTraces(gd, update, [0, 1]);
        }).then(function() {
            assertDataPts([5, 5]);

            done();
        });
    });

    it('should display to hover labels on mouse over', function(done) {
        function assertMouseMove(pos, len) {
            return _mouseEvent('mousemove', pos, function() {
                var hoverLabels = d3.select('.hoverlayer').selectAll('g');

                expect(hoverLabels.size()).toEqual(len);
            });
        }

        assertMouseMove(blankPos, 0).then(function() {
            return assertMouseMove(pointPos, 1);
        }).then(done);
    });

    it('should respond to hover interactions by', function(done) {
        var hoverCnt = 0,
            unhoverCnt = 0;

        var hoverData, unhoverData;

        gd.on('plotly_hover', function(eventData) {
            hoverCnt++;
            hoverData = eventData.points[0];
        });

        gd.on('plotly_unhover', function(eventData) {
            unhoverCnt++;
            unhoverData = eventData.points[0];
        });

        _mouseEvent('mousemove', blankPos, function() {
            expect(hoverData).toBe(undefined, 'not firing on blank points');
            expect(unhoverData).toBe(undefined, 'not firing on blank points');
        })
        .then(function() {
            return _mouseEvent('mousemove', pointPos, function() {
                expect(hoverData).not.toBe(undefined, 'firing on data points');
                expect(Object.keys(hoverData)).toEqual([
                    'data', 'fullData', 'curveNumber', 'pointNumber',
                    'x', 'y', 'xaxis', 'yaxis'
                ], 'returning the correct event data keys');
                expect(hoverData.curveNumber).toEqual(0, 'returning the correct curve number');
                expect(hoverData.pointNumber).toEqual(0, 'returning the correct point number');
            });
        })
        .then(function() {
            return _mouseEvent('mousemove', blankPos, function() {
                expect(unhoverData).not.toBe(undefined, 'firing on data points');
                expect(Object.keys(unhoverData)).toEqual([
                    'data', 'fullData', 'curveNumber', 'pointNumber',
                    'x', 'y', 'xaxis', 'yaxis'
                ], 'returning the correct event data keys');
                expect(unhoverData.curveNumber).toEqual(0, 'returning the correct curve number');
                expect(unhoverData.pointNumber).toEqual(0, 'returning the correct point number');
            });
        })
        .then(function() {
            expect(hoverCnt).toEqual(1);
            expect(unhoverCnt).toEqual(1);

            done();
        });
    });

    it('should respond to click interactions by', function(done) {
        var ptData;

        gd.on('plotly_click', function(eventData) {
            ptData = eventData.points[0];
        });

        function _click(pos, cb) {
            var promise = _mouseEvent('mousemove', pos, noop).then(function() {
                return _mouseEvent('mousedown', pos, noop);
            }).then(function() {
                return _mouseEvent('click', pos, cb);
            });

            return promise;
        }

        _click(blankPos, function() {
            expect(ptData).toBe(undefined, 'not firing on blank points');
        })
        .then(function() {
            return _click(pointPos, function() {
                expect(ptData).not.toBe(undefined, 'firing on data points');
                expect(Object.keys(ptData)).toEqual([
                    'data', 'fullData', 'curveNumber', 'pointNumber',
                    'x', 'y', 'xaxis', 'yaxis'
                ], 'returning the correct event data keys');
                expect(ptData.curveNumber).toEqual(0, 'returning the correct curve number');
                expect(ptData.pointNumber).toEqual(0, 'returning the correct point number');
            });
        })
        .then(done);
    });

    it('should respond drag / scroll interactions', function(done) {
        function _drag(p0, p1, cb) {
            var promise = _mouseEvent('mousemove', p0, noop).then(function() {
                return _mouseEvent('mousedown', p0, noop);
            }).then(function() {
                return _mouseEvent('mousemove', p1, noop);
            }).then(function() {
                return _mouseEvent('mouseup', p1, cb);
            });

            return promise;
        }

        function assertLayout(center, zoom) {
            var mapInfo = getMapInfo(gd),
                layout = gd.layout.mapbox;

            expect([mapInfo.center.lng, mapInfo.center.lat])
                .toBeCloseToArray(center);
            expect(mapInfo.zoom).toBeCloseTo(zoom);

            expect([layout.center.lon, layout.center.lat])
                .toBeCloseToArray(center);
            expect(layout.zoom).toBeCloseTo(zoom);
        }

        assertLayout([-4.710, 19.475], 1.234);

        var p1 = [pointPos[0] + 50, pointPos[1] - 20];

        _drag(pointPos, p1, function() {
            assertLayout([-19.651, 13.751], 1.234);
        })
        .then(done);

        // TODO test scroll

    });

    function getMapInfo(gd) {
        var subplot = gd._fullLayout.mapbox._subplot,
            map = subplot.map;

        var sources = map.style.sources,
            layers = map.style._layers;

        var plotlySources = Object.keys(sources).filter(function(k) {
            return k.indexOf('-source-') !== -1;
        });

        var plotlyLayers = Object.keys(layers).filter(function(k) {
            return k.indexOf('-layer-') !== -1;
        });

        return {
            map: map,
            div: subplot.div,
            sources: sources,
            layers: layers,
            plotlySources: plotlySources,
            plotlyLayers: plotlyLayers,
            center: map.getCenter(),
            zoom: map.getZoom(),
            style: map.getStyle()
        };
    }

    function countVisibleTraces(gd, modes) {
        var mapInfo = getMapInfo(gd),
            cnts = [];

        modes.forEach(function(mode) {
            var cntPerMode = 0;

            mapInfo.plotlyLayers.forEach(function(l) {
                var info = mapInfo.layers[l];

                if(l.indexOf(mode) === -1) return;
                if(info.layout.visibility === 'visible') cntPerMode++;
            });

            cnts.push(cntPerMode);
        });

        var cnt = cnts.reduce(function(a, b) {
            return (a === b) ? a : null;
        });

        // returns null if not all counter per mode are the same,
        // returns the counter if all are the same.

        return cnt;
    }

    function getStyle(gd, mode, prop) {
        var mapInfo = getMapInfo(gd),
            values = [];

        mapInfo.plotlyLayers.forEach(function(l) {
            var info = mapInfo.layers[l];

            if(l.indexOf(mode) === -1) return;

            values.push(info.paint[prop]);
        });

        return values;
    }

    function getGeoJsonData(gd, mode) {
        var mapInfo = getMapInfo(gd),
            out = [];

        mapInfo.plotlySources.forEach(function(s) {
            var info = mapInfo.sources[s];

            if(s.indexOf(mode) === -1) return;

            out.push(info._data);
        });

        return out;
    }

    function _mouseEvent(type, pos, cb) {
        var DELAY = 100;

        return new Promise(function(resolve) {
            mouseEvent(type, pos[0], pos[1]);

            setTimeout(function() {
                cb();
                resolve();
            }, DELAY);
        });
    }

});
