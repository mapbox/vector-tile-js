'use strict';

var VectorTileFeature = require('./vectortilefeature.js');

module.exports = VectorTileLayer;

function VectorTileLayer(pbf, end) {
    // Public
    this.version = 1;
    this.name = null;
    this.extent = 4096;
    this.length = 0;

    // Private
    this._pbf = pbf;
    this._keys = [];
    this._values = [];
    this._features = [];

    // VT3-specific
    this.tileX = null;
    this.tileY = null;
    this.tileZ = null;

    this._stringValues = [];
    this._floatValues = [];
    this._doubleValues = [];
    this._intValues = [];

    this._elevationScaling = new Scaling();
    this._attributeScalings = [];

    pbf.readFields(readLayer, this, end);

    this.length = this._features.length;
}

function readLayer(tag, layer, pbf) {
    if (tag === 15) layer.version = pbf.readVarint();
    else if (tag === 1) layer.name = pbf.readString();
    else if (tag === 2) layer._features.push(pbf.pos);
    else if (tag === 3) layer._keys.push(pbf.readString());
    else if (tag === 4) layer._values.push(readValueMessage(pbf));
    else if (tag === 5) layer.extent = pbf.readVarint();

    // VT3 fields
    else if (tag === 6) layer._stringValues.push(pbf.readString());
    else if (tag === 7) layer._floatValues.push(pbf.readFloat());
    else if (tag === 8) layer._doubleValues.push(pbf.readDouble());
    else if (tag === 9) layer._intValues.push(pbf.readFixed());
    else if (tag === 10) pbf.readMessage(readScaling, layer._elevationScaling);
    else if (tag === 11) layer._attributeScalings.push(pbf.readMessage(readScaling, new Scaling()));
    else if (tag === 12) layer.tileX = pbf.readVarint();
    else if (tag === 13) layer.tileY = pbf.readVarint();
    else if (tag === 14) layer.tileZ = pbf.readVarint();
}

function readValueMessage(pbf) {
    var value = null,
        end = pbf.readVarint() + pbf.pos;

    while (pbf.pos < end) {
        var tag = pbf.readVarint() >> 3;

        value = tag === 1 ? pbf.readString() :
            tag === 2 ? pbf.readFloat() :
            tag === 3 ? pbf.readDouble() :
            tag === 4 ? pbf.readVarint64() :
            tag === 5 ? pbf.readVarint() :
            tag === 6 ? pbf.readSVarint() :
            tag === 7 ? pbf.readBoolean() : null;
    }

    return value;
}

function readScaling(tag, scaling, pbf) {
    if (tag === 1) scaling.offset = pbf.readSVarint();
    else if (tag === 2) scaling.multiplier = pbf.readDouble();
    else if (tag === 3) scaling.base = pbf.readDouble();
}

// return feature `i` from this layer as a `VectorTileFeature`
VectorTileLayer.prototype.feature = function(i) {
    if (i < 0 || i >= this._features.length) throw new Error('feature index out of bounds');

    this._pbf.pos = this._features[i];

    var end = this._pbf.readVarint() + this._pbf.pos;
    return new VectorTileFeature(this._pbf, end, this);
};

// Decode VT3 attributes (complex values)
VectorTileLayer.prototype._readAttribute = function(pbf) {
    var complexValue = pbf.readVarint();
    var type = complexValue & 0x0f;
    var parameter = complexValue >> 4;

    switch (type) {
    case 0: return this._stringValues[parameter];
    case 1: return this._floatValues[parameter];
    case 2: return this._doubleValues[parameter];
    case 3: return this._intValues[parameter];
    case 4: return decodeZigzag(this._intValues[parameter]);
    case 5: return parameter;
    case 6: return decodeZigzag(parameter);
    case 7: return parameter === 0 ? null : Boolean(parameter >> 1);
    case 8: // list
        var values = [];
        for (var i = 0; i < parameter; i++) {
            values.push(this._readAttribute(pbf));
        }
        return values;
    case 9: // map
        var properties = {};
        for (i = 0; i < parameter; i++) {
            var keyIndex = pbf.readVarint();
            properties[this._keys[keyIndex]] = this._readAttribute(pbf);
        }
        return properties;
    case 10: // delta-encoded list
        values = [];
        var scaling = this._attributeScalings[pbf.readVarint()];
        var value = 0;
        for (i = 0; i < parameter; i++) {
            var encoding = pbf.readVarint();
            if (encoding === 0) {
                values.push(null);
            } else {
                value += decodeZigzag(encoding - 1);
                values.push(scaling.scale(value));
            }
        }
        return values;
    }

    throw new Error('Unrecognized complex value type: ' + type);
};

function decodeZigzag(value) {
    return (value % 2 === 1 ? -value - 1 : value) >> 1;
}

// VT3 Scaling
function Scaling(offset, multiplier, base) {
    this.offset = offset || 0;
    this.multiplier = multiplier || 1;
    this.base = base || 0;
}

Scaling.prototype.scale = function(value) {
    return this.base + this.multiplier * (value + this.offset);
};
