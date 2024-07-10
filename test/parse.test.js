import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import Protobuf from 'pbf';
import {VectorTile, VectorTileLayer, VectorTileFeature} from '../index.js';
import Point from '@mapbox/point-geometry';

function getFixtureTile(name) {
    const data = fs.readFileSync(new URL(`fixtures/${name}.pbf`, import.meta.url));
    return new VectorTile(new Protobuf(data));
}

const tile = getFixtureTile('14-8801-5371.vector');

function approximateDeepEqual(a, b, epsilon) {
    epsilon = epsilon || 1e-6;

    if (typeof a !== typeof b)
        return false;
    if (typeof a === 'number')
        return Math.abs(a - b) < epsilon;
    if (a === null || typeof a !== 'object')
        return a === b;

    const ka = Object.keys(a);
    const kb = Object.keys(b);

    if (ka.length !== kb.length)
        return false;

    ka.sort();
    kb.sort();

    for (let i = 0; i < ka.length; i++)
        if (ka[i] !== kb[i] || !approximateDeepEqual(a[ka[i]], b[ka[i]], epsilon))
            return false;

    return true;
}

test('should have all layers', () => {
    assert.deepEqual(Object.keys(tile.layers), [
        'landuse', 'waterway', 'water', 'barrier_line', 'building',
        'landuse_overlay', 'tunnel', 'road', 'bridge', 'place_label',
        'water_label', 'poi_label', 'road_label', 'waterway_label']);
});

test('should extract the tags of a feature', () => {
    assert.equal(tile.layers.poi_label.length, 558);

    const park = tile.layers.poi_label.feature(11);

    assert.deepEqual(park.bbox(), [3898, 1731, 3898, 1731]);

    assert.throws(() => {
        tile.layers.poi_label.feature(1e9);
    }, 'throws on reading a feature out of bounds');

    assert.equal(park.id, 3000003150561);

    assert.equal(park.properties.name, 'Mauerpark');
    assert.equal(park.properties.type, 'Park');

    // Check point geometry
    assert.deepEqual(park.loadGeometry(), [[new Point(3898, 1731)]]);

    // Check line geometry
    assert.deepEqual(tile.layers.road.feature(656).loadGeometry(), [[new Point(1988, 306), new Point(1808, 321), new Point(1506, 347)]]);
});

test('changing first point of a polygon should not change last point', () => {
    const building = tile.layers.building.feature(0).loadGeometry();
    assert.deepEqual(building, [[new Point(2039, -32), new Point(2035, -31), new Point(2032, -31), new Point(2032, -32), new Point(2039, -32)]]);
    building[0][0].x = 1;
    building[0][0].y = 2;
    building[0][1].x = 3;
    building[0][1].y = 4;
    assert.deepEqual(building, [[new Point(1, 2), new Point(3, 4), new Point(2032, -31), new Point(2032, -32), new Point(2039, -32)]]);
});

test('toGeoJSON', () => {
    assert.ok(approximateDeepEqual(tile.layers.poi_label.feature(11).toGeoJSON(8801, 5371, 14), {
        type: 'Feature',
        id: 3000003150561,
        properties: {
            localrank: 1,
            maki: 'park',
            name: 'Mauerpark',
            'name_de': 'Mauerpark',
            'name_en': 'Mauerpark',
            'name_es': 'Mauerpark',
            'name_fr': 'Mauerpark',
            'osm_id': 3000003150561,
            ref: '',
            scalerank: 2,
            type: 'Park'
        },
        geometry: {
            type: 'Point',
            coordinates: [13.402258157730103, 52.54398925380624]
        }
    }));

    assert.ok(approximateDeepEqual(tile.layers.bridge.feature(0).toGeoJSON(8801, 5371, 14), {
        type: 'Feature',
        id: 238162948,
        properties: {
            class: 'service',
            oneway: 0,
            'osm_id': 238162948,
            type: 'service'
        },
        geometry: {
            type: 'LineString',
            coordinates: [[13.399457931518555, 52.546334844036416], [13.399441838264465, 52.546504478525016]]
        }
    }));

    assert.ok(approximateDeepEqual(tile.layers.building.feature(0).toGeoJSON(8801, 5371, 14), {
        type: 'Feature',
        id: 1000267229912,
        properties: {
            'osm_id': 1000267229912
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[[13.392285704612732, 52.54974045706258], [13.392264246940613, 52.549737195107554],
                [13.392248153686523, 52.549737195107554], [13.392248153686523, 52.54974045706258],
                [13.392285704612732, 52.54974045706258]]]
        }
    }));

    function geoJSONFromFixture(name) {
        const tile = getFixtureTile(name);
        return tile.layers.geojson.feature(0).toGeoJSON(0, 0, 0);
    }

    // https://github.com/mapbox/vector-tile-spec/issues/30
    assert.ok(approximateDeepEqual(geoJSONFromFixture('singleton-multi-point').geometry, {
        type: 'Point',
        coordinates: [1, 2]
    }, 1e-1));
    assert.ok(approximateDeepEqual(geoJSONFromFixture('singleton-multi-line').geometry, {
        type: 'LineString',
        coordinates: [[1, 2], [3, 4]]
    }, 1e-1));
    assert.ok(approximateDeepEqual(geoJSONFromFixture('singleton-multi-polygon').geometry, {
        type: 'Polygon',
        coordinates: [[[1, 0], [0, 0], [1, 1], [1, 0]]]
    }, 1e-1));

    assert.ok(approximateDeepEqual(geoJSONFromFixture('multi-point').geometry, {
        type: 'MultiPoint',
        coordinates: [[1, 2], [3, 4]]
    }, 1e-1));
    assert.ok(approximateDeepEqual(geoJSONFromFixture('multi-line').geometry, {
        type: 'MultiLineString',
        coordinates: [[[1, 2], [3, 4]], [[5, 6], [7, 8]]]
    }, 1e-1));
    assert.ok(approximateDeepEqual(geoJSONFromFixture('multi-polygon').geometry, {
        type: 'MultiPolygon',
        coordinates: [[[[1, 0], [0, 0], [1, 1], [1, 0]]], [[[-1, -1], [-1, 0], [0, 0], [-1, -1]]]]
    }, 1e-1));

    // https://github.com/mapbox/vector-tile-js/issues/32
    assert.ok(approximateDeepEqual(geoJSONFromFixture('polygon-with-inner').geometry, {
        type: 'Polygon',
        coordinates: [[[2, -2], [-2, -2], [-2, 2], [2, 2], [2, -2]], [[-1, 1], [-1, -1], [1, -1], [1, 1], [-1, 1]]]
    }, 1e-1));
    assert.ok(approximateDeepEqual(geoJSONFromFixture('stacked-multipolygon').geometry, {
        type: 'MultiPolygon',
        coordinates: [[[[2, -2], [-2, -2], [-2, 2], [2, 2], [2, -2]]], [[[1, -1], [-1, -1], [-1, 1], [1, 1], [1, -1]]]]
    }, 1e-1));

});

test('VectorTileLayer', () => {
    const emptyLayer = new VectorTileLayer(new Protobuf(Buffer.alloc(0)));
    assert.ok(emptyLayer, 'can be created with no values');
});

test('VectorTileFeature', () => {
    const emptyFeature = new VectorTileFeature(new Protobuf(Buffer.alloc(0)));
    assert.ok(emptyFeature, 'can be created with no values');
    assert.ok(Array.isArray(VectorTileFeature.types));
    assert.deepEqual(VectorTileFeature.types, ['Unknown', 'Point', 'LineString', 'Polygon']);
});

test('https://github.com/mapbox/vector-tile-js/issues/15', () => {
    const tile = getFixtureTile('lots-of-tags.vector');
    assert.ok(tile.layers['stuttgart-rails'].feature(0));
});

test('https://github.com/mapbox/mapbox-gl-js/issues/1019', () => {
    const tile = getFixtureTile('12-1143-1497.vector');
    assert.ok(tile.layers.water.feature(1).loadGeometry());
});

test('https://github.com/mapbox/vector-tile-js/issues/60', () => {
    const tile = getFixtureTile('multipolygon-with-closepath');
    for (const id in tile.layers) {
        const layer = tile.layers[id];
        for (let i = 0; i < layer.length; i++) {
            layer.feature(i).loadGeometry();
        }
    }
});
