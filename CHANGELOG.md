## vector-tile-js changelog

### 2.0.0 (in progress)

- The structure of the return value of `loadGeometry()` was normalized. For point features, `loadGeometry()` now returns
  an array of points. For polygon features, `loadGeometry()` now classifies rings and groups them into outer and inner
  rings, using an extra level of array nesting. I.e., the return value for polygons is an array of arrays of arrays of
  Points. The structure for line features (array of arrays of points) is unchanged.
- `toGeoJSON()` now classifies polygons into `Polygon` and `MultiPolygon` types based on ring structure.

### 1.2.0 (2015-12-10)

- Added "id" property to toGeoJSON() output

### 1.1.3 (2015-06-15)

- Workaround for https://github.com/mapbox/mapnik-vector-tile/issues/90

### 1.1.2 (2015-03-05)

- Fixed decoding of negative values in feature properties

### 1.1.1 (2015-02-25)

- Remove sphericalmercator dependency
- Correctly handle MultiPoint and MultiLineString features in toGeoJSON()

### 1.1.0 (2015-02-21)

- Added VectorTileFeature#toGeoJSON()

### 1.0.0 (2014-12-26)

### 0.0.1 (2014-04-13)

- Initial release
