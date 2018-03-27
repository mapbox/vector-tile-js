const fs = require('fs');
const path = require('path');
const vtjs = require('../build/libvtzero_wasm');

if (vtjs.VectorTile) {
    start();
} else {
    vtjs.onRuntimeInitialized = start;
}

function start() {
    var tiledata = fs.readFileSync(path.join(__dirname, '/fixtures/14-8801-5371.vector.pbf'));
    const tile = new vtjs.VectorTile(tiledata);
    const count = tile.num_layers();
    for(let i = 0; i < count; i++) {
        const layer = tile.layer(i);
        console.log({
            name: layer.name(),
            version: layer.version(),
            extent: layer.extent(),
            length: layer.length()
        });
    }
}

