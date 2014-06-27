# vector-tile-js

[![build status](https://secure.travis-ci.org/mapbox/vector-tile-js.png)](http://travis-ci.org/mapbox/vector-tile-js) [![Coverage Status](https://coveralls.io/repos/mapbox/vector-tile-js/badge.png)](https://coveralls.io/r/mapbox/vector-tile-js)

This library reads vector tiles and allows access to the layers and features.

## Example

```js
var tile = new VectorTile(data);

// Contains a map of all layers
tile.layers;

var landuse = tile.layers.landuse;

// Amount of features in this layer
landuse.length;

// Returns the first feature
landuse.feature(0);
```

## Depends

 - Node.js v0.10.x or v0.8.x


## Install

To install:

    npm install vector-tile


## API Reference


### VectorTile

An object that parses vector tile data and makes it readable.

#### Constructor

- **new VectorTile(buffer[, end])** &mdash;
  parses the vector tile data given a [Protobuf](https://github.com/mapbox/pbf) buffer,
  saving resulting layers in the created object as a `layers` property. Optionally accepts end index.

#### Properties

- **layers** (Object) &mdash; an object containing parsed layers in the form of `{<name>: <layer>, ...}`,
where each layer is a `VectorTileLayer` object.


### VectorTileLayer

An object that contains the data for a single vector tile layer.

#### Properties

- **version** (`Number`, default: `1`)
- **name** (`String) `&mdash; layer name
- **extent** (`Number`, default: `4096`) &mdash; tile extent size
- **length** (`Number`) &mdash; number of features in the layer

#### Methods

- **feature(i)** &mdash; get a feature (`VectorTileFeature`) by the given index from the layer.


### VectorTileFeature

An object that contains the data for a single feature.

#### Properties

- **type** (`Number`) &mdash; type of the feature (also see `VectorTileFeature.types`)
- **extent** (`Number`) &mdash; feature extent size

#### Methods

- **loadGeometry()** &mdash; parses feature geometry and returns an array of
  [Point](https://github.com/mapbox/point-geometry) arrays (with each point having `x` and `y` properties)
- **bbox()** &mdash; calculates and returns the bounding box of the feature in the form `[x1, y1, x2, y2]`
