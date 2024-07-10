import Pbf from 'pbf';
import {VectorTile} from './index.js';
import Benchmark from 'benchmark';
import fs from 'fs';

const suite = new Benchmark.Suite();
const data = fs.readFileSync(new URL('test/fixtures/14-8801-5371.vector.pbf', import.meta.url));

readTile(); // output any errors before running the suite
readTile(true);

suite
    .add('read tile with geometries', () => {
        readTile(true);
    })
    .add('read tile without geometries', () => {
        readTile();
    })
    .on('cycle', (event) => {
        console.log(String(event.target));
    })
    .run();


function readTile(loadGeom) {
    const buf = new Pbf(data),
        vt = new VectorTile(buf);

    for (const id in vt.layers) {
        const layer = vt.layers[id];
        for (let i = 0; i < layer.length; i++) {
            const feature = layer.feature(i);
            if (loadGeom) feature.loadGeometry();
        }
    }
}
