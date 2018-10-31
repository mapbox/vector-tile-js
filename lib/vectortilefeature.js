'use strict';

var Point = require('@mapbox/point-geometry');

module.exports = VectorTileFeature;

function VectorTileFeature(pbf, end, layer) {
    // Public
    this.properties = {};
    this.extent = layer.extent;
    this.type = 0;

    // Private
    this._pbf = pbf;
    this._layer = layer;
    this._geometry = -1;

    // VT3
    this._geometricAttributes = -1;
    this._elevation = -1;
    this._splineKnots = -1;

    pbf.readFields(readFeature, this, end);
}

function readFeature(tag, feature, pbf) {
    if (tag == 1) feature.id = pbf.readVarint();
    else if (tag == 2) readTag(pbf, feature);
    else if (tag == 3) feature.type = pbf.readVarint();
    else if (tag == 4) feature._geometry = pbf.pos;

    // VT3 fields
    else if (tag == 5) readTag(pbf, feature, true);
    else if (tag == 6) feature._geometricAttributes = pbf.pos;
    else if (tag == 7) feature._elevation = pbf.pos;
    else if (tag == 8) feature._splineKnots = pbf.pos;
    else if (tag == 9) feature._splineDegree = pbf.readVarint();
    else if (tag == 10) feature.id = pbf.readString();
}

function readTag(pbf, feature, isVT3) {
    var end = pbf.readVarint() + pbf.pos;
    var layer = feature._layer;

    while (pbf.pos < end) {
        var key = layer._keys[pbf.readVarint()];
        var value = isVT3 ? layer._readAttribute(pbf) : layer._values[pbf.readVarint()];
        feature.properties[key] = value;
    }
}

VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon'];

VectorTileFeature.prototype.loadGeometry = function() {
    var pbf = this._pbf;
    pbf.pos = this._geometry;

    var end = pbf.readVarint() + pbf.pos,
        cmd = 1,
        length = 0,
        x = 0,
        y = 0,
        lines = [],
        line;

    while (pbf.pos < end) {
        if (length <= 0) {
            var cmdLen = pbf.readVarint();
            cmd = cmdLen & 0x7;
            length = cmdLen >> 3;
        }

        length--;

        if (cmd === 1 || cmd === 2) {
            x += pbf.readSVarint();
            y += pbf.readSVarint();

            if (cmd === 1) { // moveTo
                if (line) lines.push(line);
                line = [];
            }

            line.push(new Point(x, y));

        } else if (cmd === 7) {

            // Workaround for https://github.com/mapbox/mapnik-vector-tile/issues/90
            if (line) {
                line.push(line[0].clone()); // closePolygon
            }

        } else {
            throw new Error('unknown command ' + cmd);
        }
    }

    if (line) lines.push(line);

    return lines;
};

// TODO reorganize with nesting that follows geometry nesting
VectorTileFeature.prototype.loadGeometricAttributes = function() {
    if (this._geometricAttributes === -1) return null;

    var pbf = this._pbf;
    pbf.pos = this._geometricAttributes;

    var end = pbf.readVarint() + pbf.pos;
    var attributes = {};

    while (pbf.pos < end) {
        var key = this._layer._keys[pbf.readVarint()];
        var value = this._layer._readAttribute(pbf);
        attributes[key] = value;
    }

    return attributes;
};

// TODO: embed into loadGeometry with nesting
VectorTileFeature.prototype.loadElevation = function() {
    if (this._elevation === -1) return null;

    var pbf = this._pbf;
    pbf.pos = this._elevation;

    var end = pbf.readVarint() + pbf.pos;
    var elevation = [];
    var value = 0;

    while (pbf.pos < end) {
        value += pbf.readSVarint();
        elevation.push(this._layer._elevationScaling.scale(value));
    }

    return elevation;
};

VectorTileFeature.prototype.loadSplineKnots = function() {
    if (this._splineKnots === -1) return null;

    var pbf = this._pbf;
    pbf.pos = this._splineKnots;

    var end = pbf.readVarint() + pbf.pos;
    var knots = [];

    while (pbf.pos < end) {
        knots.push(this._layer._readAttribute(pbf));
    }
    return knots;
};

VectorTileFeature.prototype.bbox = function() {
    var pbf = this._pbf;
    pbf.pos = this._geometry;

    var end = pbf.readVarint() + pbf.pos,
        cmd = 1,
        length = 0,
        x = 0,
        y = 0,
        x1 = Infinity,
        x2 = -Infinity,
        y1 = Infinity,
        y2 = -Infinity;

    while (pbf.pos < end) {
        if (length <= 0) {
            var cmdLen = pbf.readVarint();
            cmd = cmdLen & 0x7;
            length = cmdLen >> 3;
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
            throw new Error('unknown command ' + cmd);
        }
    }

    return [x1, y1, x2, y2];
};

VectorTileFeature.prototype.toGeoJSON = function(x, y, z) {
    var size = this.extent * Math.pow(2, z),
        x0 = this.extent * x,
        y0 = this.extent * y,
        coords = this.loadGeometry(),
        type = VectorTileFeature.types[this.type],
        i, j;

    function project(line) {
        for (var j = 0; j < line.length; j++) {
            var p = line[j], y2 = 180 - (p.y + y0) * 360 / size;
            line[j] = [
                (p.x + x0) * 360 / size - 180,
                360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90
            ];
        }
    }

    switch (this.type) {
    case 1:
        var points = [];
        for (i = 0; i < coords.length; i++) {
            points[i] = coords[i][0];
        }
        coords = points;
        project(coords);
        break;

    case 2:
        for (i = 0; i < coords.length; i++) {
            project(coords[i]);
        }
        break;

    case 3:
        coords = classifyRings(coords);
        for (i = 0; i < coords.length; i++) {
            for (j = 0; j < coords[i].length; j++) {
                project(coords[i][j]);
            }
        }
        break;
    }

    if (coords.length === 1) {
        coords = coords[0];
    } else {
        type = 'Multi' + type;
    }

    var result = {
        type: "Feature",
        geometry: {
            type: type,
            coordinates: coords
        },
        properties: this.properties
    };

    if ('id' in this) {
        result.id = this.id;
    }

    return result;
};

// classifies an array of rings into polygons with outer rings and holes

function classifyRings(rings) {
    var len = rings.length;

    if (len <= 1) return [rings];

    var polygons = [],
        polygon,
        ccw;

    for (var i = 0; i < len; i++) {
        var area = signedArea(rings[i]);
        if (area === 0) continue;

        if (ccw === undefined) ccw = area < 0;

        if (ccw === area < 0) {
            if (polygon) polygons.push(polygon);
            polygon = [rings[i]];

        } else {
            polygon.push(rings[i]);
        }
    }
    if (polygon) polygons.push(polygon);

    return polygons;
}

function signedArea(ring) {
    var sum = 0;
    for (var i = 0, len = ring.length, j = len - 1, p1, p2; i < len; j = i++) {
        p1 = ring[i];
        p2 = ring[j];
        sum += (p2.x - p1.x) * (p1.y + p2.y);
    }
    return sum;
}
