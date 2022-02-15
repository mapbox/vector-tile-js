import type Pbf from 'pbf';

export class VectorTile {
    constructor(pbf: Pbf);
    layers: {[_: string]: VectorTileLayer};
}

export class VectorTileFeature {
    static types: ['Unknown', 'Point', 'LineString', 'Polygon'];
    extent: number;
    type: 1 | 2 | 3;
    id: number;
    properties: {[_: string]: string | number | boolean};
    loadGeometry(): Array<Array<Point>>;
    toGeoJSON(x: number, y: number, z: number): GeoJSON.Feature;
    bbox?(): [number, number, number, number];
}

export class VectorTileLayer {
    constructor(pbf: Pbf);
    version?: number;
    name: string;
    extent: number;
    length: number;
    feature(featureIndex: number): VectorTileFeature;
}
