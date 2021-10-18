import type Pbf from 'pbf';

export class VectorTile {
    constructor(pbf: Pbf);
}
export class VectorTileFeature {
    static types: ['Unknown', 'Point', 'LineString', 'Polygon'];
    loadGeometry(): {x: number, y: number}[][];
    toGeoJSON(x: number, y: number, z: number): GeoJSON.Feature;
    bbox(): [number, number, number, number];
}
export class VectorTileLayer {
    constructor(pbf: Pbf);
    feature(featureIndex: number): VectorTileFeature;
}
