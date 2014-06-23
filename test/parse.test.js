var test = require('tape'),
    fs = require('fs'),
    VectorTile = require('..').VectorTile,
    VectorTileLayer = require('..').VectorTileLayer,
    VectorTileFeature = require('..').VectorTileFeature;

test('parsing vector tiles', function(t) {
    var data = fs.readFileSync('./test/fixtures/14-8801-5371.vector.pbf');

    t.test('should have all layers', function(t) {
        var tile = new VectorTile(data);

        t.deepEqual(Object.keys(tile.layers), [
            'landuse', 'waterway', 'water', 'barrier_line', 'building',
            'landuse_overlay', 'tunnel', 'road', 'bridge', 'place_label',
            'water_label', 'poi_label', 'road_label', 'waterway_label' ]);

        t.end();
    });

    t.test('should extract the tags of a feature', function(t) {
        var tile = new VectorTile(data);

        t.equal(tile.layers.poi_label.length, 558);

        var park = tile.layers.poi_label.feature(11);

        t.deepEqual(park.bbox(), [ 3898, 1731, 3898, 1731 ]);

        t.throws(function() {
            var park = tile.layers.poi_label.feature(1e9);
        }, 'throws on reading a feature out of bounds');

        t.equal(park.name, 'Mauerpark');
        t.equal(park.type, 'Park');

        // Check point geometry
        t.deepEqual(park.loadGeometry(), [ [ { x: 3898, y: 1731 } ] ]);

        // Check line geometry
        t.deepEqual(tile.layers.road.feature(656).loadGeometry(), [ [ { x: 1988, y: 306 }, { x: 1808, y: 321 }, { x: 1506, y: 347 } ] ]);
        t.end();
    });
});

test('VectorTileLayer', function(t) {
    var emptyLayer = new VectorTileLayer(new Buffer([]));
    t.ok(emptyLayer, 'can be created with no values');
    t.end();
});

test('VectorTileFeature', function(t) {
    var emptyFeature = new VectorTileFeature(new Buffer([]));
    t.ok(emptyFeature, 'can be created with no values');
    t.end();
});
