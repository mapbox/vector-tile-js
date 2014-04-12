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
