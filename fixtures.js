var mapnik = require('mapnik');
var path = require('path');
var fs = require('fs');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'geojson.input'));

var fixtures = {
    "zero-point": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPoint",
                    "coordinates": []
                },
                "properties": {}
            }
        ]
    },
    "zero-line": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiLineString",
                    "coordinates": []
                },
                "properties": {}
            }
        ]
    },
    "singleton-multi-point": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPoint",
                    "coordinates": [[1, 2]]
                },
                "properties": {}
            }
        ]
    },
    "singleton-multi-line": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiLineString",
                    "coordinates": [[[1, 2], [3, 4]]]
                },
                "properties": {}
            }
        ]
    },
    "multi-point": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPoint",
                    "coordinates": [[1, 2], [3, 4]]
                },
                "properties": {}
            }
        ]
    },
    "multi-line": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiLineString",
                    "coordinates": [[[1, 2], [3, 4]], [[5, 6], [7, 8]]]
                },
                "properties": {}
            }
        ]
    }
}

for (var fixture in fixtures) {
    var vtile = new mapnik.VectorTile(0,0,0);
    vtile.addGeoJSON(JSON.stringify(fixtures[fixture]), "geojson");
    fs.writeFileSync('./test/fixtures/' + fixture + '.pbf', vtile.getData());
}
