var assert = require('assert');
var fs = require('fs');

var VectorTile = require('..');

describe('parsing vector tiles', function() {
    var data;
    before(function() {
        data = fs.readFileSync('./test/fixtures/14-8801-5371.vector.pbf');
    });


    it('should have all layers', function() {
        var tile = new VectorTile(data);

        assert.deepEqual(Object.keys(tile.layers), [
            'landuse', 'waterway', 'water', 'barrier_line', 'building',
            'landuse_overlay', 'tunnel', 'road', 'bridge', 'place_label',
            'water_label', 'poi_label', 'road_label', 'waterway_label' ]);

        // console.warn(tile.layers.poi_label);
    });

    it('should extract the tags of a feature', function() {
        var tile = new VectorTile(data);

        assert.equal(tile.layers.poi_label.length, 558);

        var park = tile.layers.poi_label.feature(11);

        assert.equal(park.name, 'Mauerpark');
        assert.equal(park.type, 'Park');

        // Check point geometry
        assert.deepEqual(park.loadGeometry(), [ [ { x: 3898, y: 1731 } ] ]);

        // Check line geometry
        assert.deepEqual(tile.layers.road.feature(656).loadGeometry(), [ [ { x: 1988, y: 306 }, { x: 1808, y: 321 }, { x: 1506, y: 347 } ] ]);
    });

    it('should convert to GeoJSON', function() {
        var tile = new VectorTile(data);
        var geojson = tile.toGeoJSON();

        assert.deepEqual(Object.keys(geojson), [
            'landuse', 'waterway', 'water', 'barrier_line', 'building',
            'landuse_overlay', 'tunnel', 'road', 'bridge', 'place_label',
            'water_label', 'poi_label', 'road_label', 'waterway_label' ]);

        assert.equal(geojson.poi_label.features.length, 558);

        var park = geojson.poi_label.features[11];

        assert.equal(park.properties.name, 'Mauerpark');
        assert.equal(park.properties.type, 'Park');

        // Check point geometry
        assert.deepEqual(park.geometry.coordinates, [ [ [3898, 1731] ] ]);

        // Check line geometry
        assert.deepEqual(geojson.road.features[656].geometry.coordinates, [ [1988, 306], [1808, 321], [1506, 347] ]);
    });
});
