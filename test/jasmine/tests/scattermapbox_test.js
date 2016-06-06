var Plotly = require('@lib');
var Plots = require('@src/plots/plots');
var Lib = require('@src/lib');

var ScatterMapbox = require('@src/traces/scattermapbox');
var convert = require('@src/traces/scattermapbox/convert');

var createGraphDiv = require('../assets/create_graph_div');
var destroyGraphDiv = require('../assets/destroy_graph_div');
var customMatchers = require('../assets/custom_matchers');


describe('scattermapbox defaults', function() {
    'use strict';

});

describe('scattermapbox calc', function() {
    'use strict';

    function _calc(trace) {
        var gd = { data: [trace] };

        Plots.supplyDefaults(gd);

        var fullTrace = gd._fullData[0];
        return ScatterMapbox.calc(gd, fullTrace);
    }

    var base = { type: 'scattermapbox' };

    it('should place lon/lat data in lonlat pairs', function() {
        var calcTrace = _calc(Lib.extendFlat({}, base, {
            lon: [10, 20, 30],
            lat: [20, 30, 10]
        }));

        expect(calcTrace).toEqual([
            { lonlat: [10, 20] },
            { lonlat: [20, 30] },
            { lonlat: [30, 10] }
        ]);
    });

    it('should coerce numeric strings lon/lat data into numbers', function() {
        var calcTrace = _calc(Lib.extendFlat({}, base, {
            lon: [10, 20, '30', '40'],
            lat: [20, '30', 10, '50']
        }));

        expect(calcTrace).toEqual([
            { lonlat: [10, 20] },
            { lonlat: [20, 30] },
            { lonlat: [30, 10] },
            { lonlat: [40, 50] }
        ]);
    });

    it('should keep track of gaps in data', function() {
        var calcTrace = _calc(Lib.extendFlat({}, base, {
            lon: [null, 10, null, null, 20, '30', null, '40', null, 10],
            lat: [10, 20, '30', null, 10, '50', null, 60, null, null]
        }));

        expect(calcTrace).toEqual([
            { lonlat: [10, 20], gapAfter: true },
            { lonlat: [20, 10] },
            { lonlat: [30, 50], gapAfter: true },
            { lonlat: [40, 60], gapAfter: true }
        ]);
    });

    it('should fill array text (base case)', function() {
        var calcTrace = _calc(Lib.extendFlat({}, base, {
            lon: [10, 20, 30],
            lat: [20, 30, 10],
            text: ['A', 'B', 'C']
        }));

        expect(calcTrace).toEqual([
            { lonlat: [10, 20], tx: 'A' },
            { lonlat: [20, 30], tx: 'B' },
            { lonlat: [30, 10], tx: 'C' }
        ]);
    });

    it('should fill array text (invalid entry case)', function() {
        var calcTrace = _calc(Lib.extendFlat({}, base, {
            lon: [10, 20, 30],
            lat: [20, 30, 10],
            text: ['A', 'B', null]
        }));

        expect(calcTrace).toEqual([
            { lonlat: [10, 20], tx: 'A' },
            { lonlat: [20, 30], tx: 'B' },
            { lonlat: [30, 10], tx: '' }
        ]);
    });

    it('should fill array marker attributes (base case)', function() {
        var calcTrace = _calc(Lib.extendFlat({}, base, {
            lon: [10, 20, null, 30],
            lat: [20, 30, null, 10],
            marker: {
                color: ['red', 'blue', 'green', 'yellow'],
                size: [10, 20, 8, 10]
            }
        }));

        expect(calcTrace).toEqual([
            { lonlat: [10, 20], mc: 'red', ms: 10, mcc: 'red', mrc: 5 },
            { lonlat: [20, 30], mc: 'blue', ms: 20, mcc: 'blue', mrc: 10, gapAfter: true },
            { lonlat: [30, 10], mc: 'yellow', ms: 10, mcc: 'yellow', mrc: 5 }
        ]);
    });

    it('should fill array marker attributes (invalid scale case)', function() {
        var calcTrace = _calc(Lib.extendFlat({}, base, {
            lon: [10, 20, null, 30],
            lat: [20, 30, null, 10],
            marker: {
                color: [0, null, 5, 10],
                size: [10, NaN, 8, 10],
                colorscale: [
                    [0, 'blue'], [0.5, 'red'], [1, 'green']
                ]
            }
        }));

        expect(calcTrace).toEqual([
            { lonlat: [10, 20], mc: 0, ms: 10, mcc: 'rgb(0, 0, 255)', mrc: 5 },
            { lonlat: [20, 30], mc: null, ms: NaN, mcc: '#444', mrc: 0, gapAfter: true },
            { lonlat: [30, 10], mc: 10, ms: 10, mcc: 'rgb(0, 128, 0)', mrc: 5 }
        ]);
    });

    it('should fill marker attributes (symbol case)', function() {
        var calcTrace = _calc(Lib.extendFlat({}, base, {
            lon: [10, 20, null, 30],
            lat: [20, 30, null, 10],
            marker: {
                symbol: ['monument', 'music', 'harbor', null]
            }
        }));

        expect(calcTrace).toEqual([
            { lonlat: [10, 20], mx: 'monument' },
            { lonlat: [20, 30], mx: 'music', gapAfter: true },
            { lonlat: [30, 10], mx: 'circle' }
        ]);
    });
});

describe('scattermapbox convert', function() {
    'use strict';

    function _convert(trace) {
        var gd = { data: [trace] };

        Plots.supplyDefaults(gd);

        var fullTrace = gd._fullData[0];
        var calcTrace = ScatterMapbox.calc(gd, fullTrace);
        calcTrace[0].trace = fullTrace;

        return convert(calcTrace);
    }

    var base = {
        type: 'scattermapbox',
        lon: [10, '20', 30, 20, null, 20, 10],
        lat: [20, 20, '10', null, 10, 10, 20]
    };

    it('for markers + circle bubbles traces, should', function() {
        var opts = _convert(Lib.extendFlat({}, base, {
            mode: 'markers',
            marker: {
                symbol: 'circle',
                size: [10, 20, null, 10, '10'],
                color: [10, null, '30', 20, 10]
            }
        }));

        assertVisibility(opts, ['none', 'none', 'visible', 'none']);

        expect(opts.circle.paint['circle-color']).toEqual({
            property: 'circle-color',
            stops: [[

            ]]
        });
    });

    it('fill + markers + lines traces, should', function() {
        var opts = _convert(Lib.extendFlat({}, base, {
            mode: 'markers+lines',
            marker: { symbol: 'circle' },
            fill: 'toself'
        }));

        assertVisibility(opts, ['visible', 'visible', 'visible', 'none']);

        var lineCoords = [[
            [10, 20], [20, 20], [30, 10]
        ], [
            [20, 10], [10, 20]
        ]];

        expect(opts.fill.geojson.coordinates).toEqual(lineCoords, 'have correct fill coords');
        expect(opts.line.geojson.coordinates).toEqual(lineCoords, 'have correct line coords');


    });

    it('for markers + non-circle traces, should', function() {
        var opts = _convert(Lib.extendFlat({}, base, {
            mode: 'markers',
            marker: { symbol: 'monument' }
        }));

        assertVisibility(opts, ['none', 'none', 'none', 'visible']);
    });

    it('for text + lines traces, should', function() {
        var opts = _convert(Lib.extendFlat({}, base, {
            mode: 'lines+text',
            connectgaps: true
        }));

        assertVisibility(opts, ['none', 'visible', 'none', 'visible']);

        var lineCoords = [[
            [10, 20], [20, 20], [30, 10], [20, 10], [10, 20]
        ]];

        expect(opts.line.geojson.coordinates).toEqual(lineCoords, 'have correct line coords');
    });

    function assertVisibility(opts, expectations) {
        var actual = ['fill', 'line', 'circle', 'symbol'].map(function(l) {
            return opts[l].layout.visibility;
        });

        var msg = 'set layer visibility properly';

        expect(actual).toEqual(expectations, msg);
    }
});

describe('scattermapbox plot', function() {
    'use strict';


});

describe('scattermapbox hover', function() {
    'use strict';

    var hoverPoints = ScatterMapbox.hoverPoints;

    var gd;

    beforeAll(function(done) {
        jasmine.addMatchers(customMatchers);

        gd = createGraphDiv();

        var data = [{
            type: 'scattermapbox',
            lon: [10, 20, 30],
            lat: [10, 20, 30],
            text: ['A', 'B', 'C']
        }];

        Plotly.plot(gd, data).then(done);
    });

    afterAll(function() {
        Plotly.purge(gd);
        destroyGraphDiv();
    });

    function getPointData(gd) {
        var cd = gd.calcdata,
            mapbox = gd._fullLayout.mapbox._subplot;

        return {
            index: false,
            distance: 20,
            cd: cd[0],
            trace: cd[0][0].trace,
            xa: mapbox.xaxis,
            ya: mapbox.yaxis
        };
    }

    it('should generate hover label info (base case)', function() {
        var xval = 11,
            yval = 11;

        var out = hoverPoints(getPointData(gd), xval, yval)[0];

        expect(out.index).toEqual(0);
        expect([out.x0, out.x1, out.y0, out.y1]).toBeCloseToArray([
            444.444, 446.444, 105.410, 107.410
        ]);
        expect(out.extraText).toEqual('(10°, 10°)<br>A');
        expect(out.color).toEqual('#1f77b4');
    });

    it('should generate hover label info (positive winding case)', function() {
        var xval = 11 + 720,
            yval = 11;

        var out = hoverPoints(getPointData(gd), xval, yval)[0];

        expect(out.index).toEqual(0);
        expect([out.x0, out.x1, out.y0, out.y1]).toBeCloseToArray([
            2492.444, 2494.444, 105.410, 107.410
        ]);
        expect(out.extraText).toEqual('(10°, 10°)<br>A');
        expect(out.color).toEqual('#1f77b4');
    });

    it('should generate hover label info (negative winding case)', function() {
        var xval = 11 - 1080,
            yval = 11;

        var out = hoverPoints(getPointData(gd), xval, yval)[0];

        expect(out.index).toEqual(0);
        expect([out.x0, out.x1, out.y0, out.y1]).toBeCloseToArray([
            -2627.555, -2625.555, 105.410, 107.410
        ]);
        expect(out.extraText).toEqual('(10°, 10°)<br>A');
        expect(out.color).toEqual('#1f77b4');
    });

    it('should generate hover label info (hoverinfo: \'lon\' case)', function(done) {
        Plotly.restyle(gd, 'hoverinfo', 'lon').then(function() {
            var xval = 11,
                yval = 11;

            var out = hoverPoints(getPointData(gd), xval, yval)[0];

            expect(out.extraText).toEqual('lon: 10°');
            done();
        });
    });

    it('should generate hover label info (hoverinfo: \'lat\' case)', function(done) {
        Plotly.restyle(gd, 'hoverinfo', 'lat').then(function() {
            var xval = 11,
                yval = 11;

            var out = hoverPoints(getPointData(gd), xval, yval)[0];

            expect(out.extraText).toEqual('lat: 10°');
            done();
        });
    });

    it('should generate hover label info (hoverinfo: \'text\' case)', function(done) {
        Plotly.restyle(gd, 'hoverinfo', 'text').then(function() {
            var xval = 11,
                yval = 11;

            var out = hoverPoints(getPointData(gd), xval, yval)[0];

            expect(out.extraText).toEqual('A');
            done();
        });
    });
});
