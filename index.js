
import Point from '@mapbox/point-geometry';

/** @import {PbfReader} from 'pbf' */
/** @import {Feature} from 'geojson' */

export class VectorTileFeature {
    /**
     * @param {PbfReader} pbf
     * @param {number} end
     * @param {number} extent
     * @param {string[]} keys
     * @param {(number | string | boolean)[]} values
     */
    constructor(pbf, end, extent, keys, values) {
        // Public

        /** @type {Record<string, number | string | boolean>} */
        this.properties = Object.create(null);

        this.extent = extent;
        /** @type {0 | 1 | 2 | 3} */
        this.type = 0;

        /** @type {number | undefined} */
        this.id = undefined;

        /** @private */
        this._pbf = pbf;
        /** @private */
        this._geometry = -1;
        /** @private */
        this._keys = keys;
        /** @private */
        this._values = values;

        while (pbf.pos < end) {
            const tag = pbf.readVarint();
            if (tag === 8) this.id = pbf.readVarint();
            else if (tag === 18) {
                const tagsEnd = pbf.readVarint() + pbf.pos;
                while (pbf.pos < tagsEnd) {
                    const key = keys[pbf.readVarint()];
                    const value = values[pbf.readVarint()];
                    this.properties[key] = value;
                }
            } else if (tag === 24) this.type = /** @type {0 | 1 | 2 | 3} */ (pbf.readVarint());
            else if (tag === 34) {
                this._geometry = pbf.pos;
                pbf.skip(tag);
            } else pbf.skip(tag);
        }
    }

    loadGeometry() {
        if (this._geometry < 0) throw new Error('feature has no geometry');
        const pbf = this._pbf;
        pbf.pos = this._geometry;

        const end = pbf.readVarint() + pbf.pos;

        /** @type Point[][] */
        const lines = [];

        /** @type Point[] | undefined */
        let line;

        let cmd = 1;
        let length = 0;
        let x = 0;
        let y = 0;

        while (pbf.pos < end) {
            if (length <= 0) {
                const cmdLen = pbf.readVarint();
                cmd = cmdLen & 0x7;
                length = cmdLen >> 3;
                if (length === 0) continue;
            }

            length--;

            if (cmd === 1) { // moveTo
                x += pbf.readSVarint();
                y += pbf.readSVarint();
                if (line) lines.push(line);
                line = [new Point(x, y)];

            } else if (cmd === 2) { // lineTo
                x += pbf.readSVarint();
                y += pbf.readSVarint();
                if (line) line.push(new Point(x, y));

            } else if (cmd === 7) {

                // Workaround for https://github.com/mapbox/mapnik-vector-tile/issues/90
                if (line) {
                    line.push(line[0].clone()); // closePolygon
                }

            } else {
                throw new Error(`unknown command ${cmd}`);
            }
        }

        if (line) lines.push(line);

        return lines;
    }

    bbox() {
        if (this._geometry < 0) throw new Error('feature has no geometry');
        const pbf = this._pbf;
        pbf.pos = this._geometry;

        const end = pbf.readVarint() + pbf.pos;
        let cmd = 1,
            length = 0,
            x = 0,
            y = 0,
            x1 = Infinity,
            x2 = -Infinity,
            y1 = Infinity,
            y2 = -Infinity;

        while (pbf.pos < end) {
            if (length <= 0) {
                const cmdLen = pbf.readVarint();
                cmd = cmdLen & 0x7;
                length = cmdLen >> 3;
                if (length === 0) continue;
            }

            length--;

            if (cmd === 1 || cmd === 2) {
                x += pbf.readSVarint();
                y += pbf.readSVarint();
                if (x < x1) x1 = x;
                if (x > x2) x2 = x;
                if (y < y1) y1 = y;
                if (y > y2) y2 = y;

            } else if (cmd !== 7) {
                throw new Error(`unknown command ${cmd}`);
            }
        }

        return [x1, y1, x2, y2];
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @return {Feature}
     */
    toGeoJSON(x, y, z) {
        const size = this.extent * Math.pow(2, z),
            x0 = this.extent * x,
            y0 = this.extent * y,
            vtCoords = this.loadGeometry();

        /** @param {Point} p */
        function projectPoint(p) {
            return [
                (p.x + x0) * 360 / size - 180,
                360 / Math.PI * Math.atan(Math.exp((1 - (p.y + y0) * 2 / size) * Math.PI)) - 90
            ];
        }

        /** @param {Point[]} line */
        function projectLine(line) {
            return line.map(projectPoint);
        }

        /** @type {Feature["geometry"]} */
        let geometry;

        if (this.type === 1) {
            const points = [];
            for (const line of vtCoords) {
                points.push(line[0]);
            }
            const coordinates = projectLine(points);
            geometry = points.length === 1 ?
                {type: 'Point', coordinates: coordinates[0]} :
                {type: 'MultiPoint', coordinates};

        } else if (this.type === 2) {

            const coordinates = vtCoords.map(projectLine);
            geometry = coordinates.length === 1 ?
                {type: 'LineString', coordinates: coordinates[0]} :
                {type: 'MultiLineString', coordinates};

        } else if (this.type === 3) {
            const polygons = classifyRings(vtCoords);
            const coordinates = [];
            for (const polygon of polygons) {
                coordinates.push(polygon.map(projectLine));
            }
            geometry = coordinates.length === 1 ?
                {type: 'Polygon', coordinates: coordinates[0]} :
                {type: 'MultiPolygon', coordinates};
        } else {

            throw new Error('unknown feature type');
        }

        /** @type {Feature} */
        const result = {
            type: 'Feature',
            geometry,
            properties: this.properties
        };

        if (this.id != null) {
            result.id = this.id;
        }

        return result;
    }
}

/** @type {['Unknown', 'Point', 'LineString', 'Polygon']} */
VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];

/** classifies an array of rings into polygons with outer rings and holes
 * @param {Point[][]} rings
 */
export function classifyRings(rings) {
    const len = rings.length;

    if (len <= 1) return [rings];

    const polygons = [];
    let polygon, ccw;

    for (let i = 0; i < len; i++) {
        const area = signedArea(rings[i]);
        if (area === 0) continue;

        if (ccw === undefined) ccw = area < 0;

        if (ccw === area < 0) {
            if (polygon) polygons.push(polygon);
            polygon = [rings[i]];

        } else if (polygon) {
            polygon.push(rings[i]);
        }
    }
    if (polygon) polygons.push(polygon);

    return polygons;
}

/** @param {Point[]} ring */
function signedArea(ring) {
    let sum = 0;
    for (let i = 0, len = ring.length, j = len - 1, p1, p2; i < len; j = i++) {
        p1 = ring[i];
        p2 = ring[j];
        sum += (p2.x - p1.x) * (p1.y + p2.y);
    }
    return sum;
}

export class VectorTileLayer {
    /**
     * @param {PbfReader} pbf
     * @param {number} [end]
     */
    constructor(pbf, end) {
        // Public
        this.version = 1;
        this.name = '';
        this.extent = 4096;
        this.length = 0;

        /** @private */
        this._pbf = pbf;

        /** @private
         * @type {string[]} */
        this._keys = [];

        /** @private
         * @type {(number | string | boolean)[]} */
        this._values = [];

        /** @private
         * @type {number[]} */
        this._features = [];

        if (end === undefined) end = pbf.length;
        while (pbf.pos < end) {
            const tag = pbf.readVarint();
            if (tag === 10) this.name = pbf.readString();
            else if (tag === 18) {
                this._features.push(pbf.pos);
                pbf.skip(tag);
            } else if (tag === 26) this._keys.push(pbf.readString());
            else if (tag === 34) this._values.push(readValueMessage(pbf));
            else if (tag === 40) this.extent = pbf.readVarint();
            else if (tag === 120) this.version = pbf.readVarint();
            else pbf.skip(tag);
        }

        this.length = this._features.length;
    }

    /** return feature `i` from this layer as a `VectorTileFeature`
     * @param {number} i
     */
    feature(i) {
        if (i < 0 || i >= this._features.length) throw new Error('feature index out of bounds');

        this._pbf.pos = this._features[i];

        const end = this._pbf.readVarint() + this._pbf.pos;
        return new VectorTileFeature(this._pbf, end, this.extent, this._keys, this._values);
    }
}

/**
 * @param {PbfReader} pbf
 */
function readValueMessage(pbf) {
    let value = null;
    const end = pbf.readVarint() + pbf.pos;

    while (pbf.pos < end) {
        const tag = pbf.readVarint();
        value =
            tag === 10 ? pbf.readString() :
            tag === 21 ? pbf.readFloat() :
            tag === 25 ? pbf.readDouble() :
            tag === 32 ? pbf.readVarint(true) :
            tag === 40 ? pbf.readVarint() :
            tag === 48 ? pbf.readSVarint() :
            tag === 56 ? pbf.readBoolean() :
            (pbf.skip(tag), null);
    }
    if (value == null) {
        throw new Error('unknown feature value');
    }

    return value;
}

export class VectorTile {
    /**
     * @param {PbfReader} pbf
     * @param {number} [end]
     */
    constructor(pbf, end = pbf.length) {
        /** @type {Record<string, VectorTileLayer>} */
        const layers = Object.create(null);
        while (pbf.pos < end) {
            const tag = pbf.readVarint();
            if (tag === 26) {
                const layer = new VectorTileLayer(pbf, pbf.readVarint() + pbf.pos);
                if (layer.length) layers[layer.name] = layer;
            } else pbf.skip(tag);
        }
        this.layers = layers;
    }
}
