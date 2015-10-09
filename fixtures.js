var mapnik = require('mapnik');
var path = require('path');
var fs = require('fs');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins, 'geojson.input'));

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
    "zero-polygon": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPolygon",
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
    "singleton-multi-polygon": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPolygon",
                    "coordinates": [[[[0, 0], [1, 0], [1, 1], [0, 0]]]]
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
    },
    "multi-polygon": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPolygon",
                    "coordinates": [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[0, 0], [-1, 0], [-1, -1], [0, 0]]]]
                },
                "properties": {}
            }
        ]
    },
    "polygon-with-inner": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[-2, 2], [2, 2], [2, -2], [-2, -2], [-2, 2]], [[-1, 1], [1, 1], [1, -1], [-1, -1], [-1, 1]]]
                },
                "properties": {}
            }
        ]
    },
    "multipolygon": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "MultiPolygon",
                    "coordinates": [
                        [
                            [
                                [
                                    -65.91796875,
                                    -23.40276490540795
                                ],
                                [
                                    -65.91796875,
                                    8.407168163601076
                                ],
                                [
                                    -35.859375,
                                    8.407168163601076
                                ],
                                [
                                    -35.859375,
                                    -23.40276490540795
                                ],
                                [
                                    -65.91796875,
                                    -23.40276490540795
                                ]
                            ]
                        ],
                        [
                            [
                                [
                                    -9.84375,
                                    12.897489183755892
                                ],
                                [
                                    -9.84375,
                                    37.16031654673677
                                ],
                                [
                                    18.28125,
                                    37.16031654673677
                                ],
                                [
                                    18.28125,
                                    12.897489183755892
                                ],
                                [
                                    -9.84375,
                                    12.897489183755892
                                ]
                            ]
                        ]
                    ]
                }
            }
        ]
    },
    "stacked-multipolygon": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPolygon",
                    "coordinates": [[[[-2, 2], [2, 2], [2, -2], [-2, -2], [-2, 2]]], [[[-1, 1], [1, 1], [1, -1], [-1, -1], [-1, 1]]]]
                },
                "properties": {}
            }
        ]
    }
}

for (var fixture in fixtures) {
    var vtile = new mapnik.VectorTile(0, 0, 0);
    vtile.addGeoJSON(JSON.stringify(fixtures[fixture]), "geojson");
    fs.writeFileSync('./test/fixtures/' + fixture + '.pbf', vtile.getData());
}
