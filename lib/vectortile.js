'use strict';

var VectorTileLayer = require('./vectortilelayer');

module.exports = VectorTile;

function VectorTile(pbf, end) {
    this.layers = pbf.readFields(readTile, {}, end);
}

function readTile(tag, layers, pbf) {
    if (tag === 3) {
        var layer = readLayer(pbf);
        if (layer.length) layers[layer.name] = layer;
    }
}

function readLayer(pbf) {
    var bytes = pbf.readVarint(),
        end = pbf.pos + bytes,
        layer = new VectorTileLayer(pbf, end);
    pbf.pos = end;
    return layer;
}
