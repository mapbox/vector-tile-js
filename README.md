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
