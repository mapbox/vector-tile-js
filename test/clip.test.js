var test = require('tape'),
    fs = require('fs'),
    Protobuf = require('pbf'),
    VectorTile = require('..').VectorTile,
    VectorTileLayer = require('..').VectorTileLayer,
    VectorTileFeature = require('..').VectorTileFeature;

test('check geometry clipping', function(t) {
    var data = fs.readFileSync(__dirname + '/fixtures/clip.pbf');

    //t.test('should have all layers', function(t) {
    //    var tile = new VectorTile(new Protobuf(data));

    //    t.deepEqual(Object.keys(tile.layers), [
    //        'polygon', 'line', 'point' ]);

    //    t.end();
    //});

    t.test('should return expected polygon', function(t) {
        var tile = new VectorTile(new Protobuf(data));

        var feature = tile.layers.polygon.feature(0);
        //t.deepEqual(feature.extent, 32768);
        //t.deepEqual(feature.type, 3);

        // define child tile
        feature.dz = 2;
        feature.xPos = 1;
        feature.yPos = 1;

        // load geometry (should be clipped)
        var geom = feature.loadGeometry();

        // check result
        t.deepEqual(geom, [[{ x: -64, y: 3072 }, { x: -64, y: -64 }, { x: 2611.2, y: -64 }, { x: 4160, y: 1872 }, { x: 4160, y: 3072 }, { x: -64, y: 3072 }]]);

        t.end();
    });

    t.test('should return expected line', function (t) {
      var tile = new VectorTile(new Protobuf(data));

      var feature = tile.layers.line.feature(0);
      //t.deepEqual(feature.extent, 32768);
      //t.deepEqual(feature.type, 2);

      // define child tile
      feature.dz = 2;
      feature.xPos = 1;
      feature.yPos = 1;

      // load geometry (should be clipped)
      var geom = feature.loadGeometry();

      // check result
      t.deepEqual(geom, [[{ x: 2611.2, y: -64 }, { x: 4160, y: 1872 }]]);

      t.end();
    });

    t.test('should return expected point', function (t) {
      var tile = new VectorTile(new Protobuf(data));

      var feature = tile.layers.point.feature(0);
      //t.deepEqual(feature.extent, 32768);
      //t.deepEqual(feature.type, 1);

      // define child tile
      feature.dz = 2;
      feature.xPos = 1;
      feature.yPos = 1;

      // load geometry (should be clipped)
      var geom = feature.loadGeometry();

      // check result
      t.deepEqual(geom, [[{ x: 1024, y: 3072 }, { x: 4096, y: 1024 }, { x: 4906, y: 4096 }]]);

      t.end();
    });


    t.test('should return null polygon', function (t) {
      var tile = new VectorTile(new Protobuf(data));

      var feature = tile.layers.polygon.feature(0);
      //t.deepEqual(feature.extent, 32768);
      //t.deepEqual(feature.type, 3);

      // define child tile
      feature.dz = 2;
      feature.xPos = 2;
      feature.yPos = 2;

      // load geometry (should be clipped)
      var geom = feature.loadGeometry();

      // check result
      t.deepEqual(geom, null);

      t.end();
    });

    t.test('should return null line', function (t) {
      var tile = new VectorTile(new Protobuf(data));

      var feature = tile.layers.line.feature(0);
      //t.deepEqual(feature.extent, 32768);
      //t.deepEqual(feature.type, 2);

      // define child tile
      feature.dz = 2;
      feature.xPos = 2;
      feature.yPos = 2;

      // load geometry (should be clipped)
      var geom = feature.loadGeometry();

      // check result
      t.deepEqual(geom, null);

      t.end();
    });

    t.test('should return null point', function (t) {
      var tile = new VectorTile(new Protobuf(data));

      var feature = tile.layers.point.feature(0);
      //t.deepEqual(feature.extent, 32768);
      //t.deepEqual(feature.type, 1);

      // define child tile
      feature.dz = 2;
      feature.xPos = 3;
      feature.yPos = 3;

      // load geometry (should be clipped)
      var geom = feature.loadGeometry();

      // check result
      t.deepEqual(geom, null);

      t.end();
    });
});
