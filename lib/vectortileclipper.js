'use strict';

var Point = require('point-geometry');

module.exports = VectorTileClipper;

function VectorTileClipper(feature) {
  this.feature = feature;

  // the ratio we'll need when producing the final result to extend back (or still reduce) to 4096
  this.finalRatio = 4096 / feature.extent * Math.pow(2, feature.dz);

  var margin = 64; // 8px times 4096/512
  margin /= this.finalRatio;

  var clipExtent = feature.extent >> feature.dz;
  if (margin > clipExtent)
    margin = clipExtent;

  this.dz = feature.dz;
  this.margin = margin;
  this.xmin = clipExtent * feature.xPos - margin;
  this.ymin = clipExtent * feature.yPos - margin;
  this.xmax = this.xmin + clipExtent + 2 * margin;
  this.ymax = this.ymin + clipExtent + 2 * margin;
  this.lines = [];

  this._prevIsIn = false;
  this.type = feature.type;
}

VectorTileClipper.prototype.loadGeometry = function() {
  var pbf = this.feature._pbf;
  pbf.pos = this.feature._geometry;

  var end = pbf.readVarint() + pbf.pos,
    cmd = 1,
    length = 0,
    x = 0,
    y = 0;

  while (pbf.pos < end) {
    if (!length) {
      var cmdLen = pbf.readVarint();
      cmd = cmdLen & 0x7;
      length = cmdLen >> 3;
    }

    length--;

    if (cmd === 1 || cmd === 2) {
      x += pbf.readSVarint();
      y += pbf.readSVarint();

      if (cmd === 1) { // moveTo
        this.moveTo(x, y);
      }
      else { // lineTo
        this.lineTo(x, y);
      }
    } else if (cmd === 7) {
      this.closePolygon();
    } else {
      throw new Error('unknown command ' + cmd);
    }
  }

  return this.result();
};

VectorTileClipper.prototype.moveTo = function(x, y) {
  this._push_line();

  this._prevIsIn = this._isIn(x, y);
  this._moveTo(x, y, this._prevIsIn);

  this._prevPt = new Point(x, y);
  this._firstPt = new Point(x, y);
};

VectorTileClipper.prototype.lineTo = function(x, y) {
  var isIn = this._isIn(x, y),
    outPt, inPt, midPt,
    pt1, pt2, ratio,
    intercept, intercepts,
    xpos, ypos,
    xtest, ytest;
  if (isIn) {
    if (this._prevIsIn){
      // both in: just push
      this._lineTo(x, y, true);
    }
    else {
      outPt = this._prevPt;
      inPt = new Point(x, y);
      midPt = this._intersect(inPt, outPt);
      this._lineTo(midPt.x, midPt.y, true);
      this._lineTo(inPt.x, inPt.y, true);
    }
  }
  else {
    if (this._prevIsIn) {
      inPt = this._prevPt;
      outPt = new Point(x, y);
      midPt = this._intersect(inPt, outPt);
      this._lineTo(midPt.x, midPt.y, true);
      this._lineTo(outPt.x, outPt.y, false);
    }
    else {
      // going from pt1 to pt2
      pt1 = this._prevPt;
      pt2 = new Point(x, y);

      // both points are outside but we could have two intersection points
      // first, rule out obvious non intersecting cases
      if ((pt1.x <= this.xmin && pt2.x <= this.xmin) ||
        (pt1.x >= this.xmax && pt2.x >= this.xmax) ||
        (pt1.y <= this.ymin && pt2.y <= this.ymin) ||
        (pt1.y >= this.ymax && pt2.y >= this.ymax)) {
        this._lineTo(pt2.x, pt2.y, false);
      }
      else {
        // figure out various intercepts, store them if they are on the extent boundary
        intercepts = [];

        // xpos and ypos are bool to indicate if below min (false) or above max (true)
        if ((pt1.x < this.xmin && pt2.x > this.xmin) || (pt1.x > this.xmin && pt2.x < this.xmin)) {
          ratio = (this.xmin - pt1.x) / (pt2.x - pt1.x);
          ytest = pt1.y + ratio * (pt2.y - pt1.y);
          if (ytest <= this.ymin)
            ypos = false;
          else if (ytest >= this.ymax)
            ypos = true;
          else {
            intercept = {};
            intercept.ratio = ratio;
            intercept.x = this.xmin;
            intercept.y = ytest;
            intercepts.push(intercept);
          }
        }
        if ((pt1.x < this.xmax && pt2.x > this.xmax) || (pt1.x > this.xmax && pt2.x < this.xmax)) {
          ratio = (this.xmax - pt1.x) / (pt2.x - pt1.x);
          ytest = pt1.y + ratio * (pt2.y - pt1.y);
          if (ytest <= this.ymin)
            ypos = false;
          else if (ytest >= this.ymax)
            ypos = true;
          else {
            intercept = {};
            intercept.ratio = ratio;
            intercept.x = this.xmax;
            intercept.y = ytest;
            intercepts.push(intercept);
          }
        }
        if ((pt1.y < this.ymin && pt2.y > this.ymin) || (pt1.y > this.ymin && pt2.y < this.ymin)) {
          ratio = (this.ymin - pt1.y) / (pt2.y - pt1.y);
          xtest = pt1.x + ratio * (pt2.x - pt1.x);
          if (xtest <= this.xmin)
            xpos = false;
          else if (xtest >= this.xmax)
            xpos = true;
          else {
            intercept = {};
            intercept.ratio = ratio;
            intercept.x = xtest;
            intercept.y = this.ymin;
            intercepts.push(intercept);
          }
        }
        if ((pt1.y < this.ymax && pt2.y > this.ymax) || (pt1.y > this.ymax && pt2.y < this.ymax)) {
          ratio = (this.ymax - pt1.y) / (pt2.y - pt1.y);
          xtest = pt1.x + ratio * (pt2.x - pt1.x);
          if (xtest <= this.xmin)
            xpos = false;
          else if (xtest >= this.xmax)
            xpos = true;
          else {
            intercept = {};
            intercept.ratio = ratio;
            intercept.x = xtest;
            intercept.y = this.ymax;
            intercepts.push(intercept);
          }
        }
        // intercepts has no more than two elements
        if (intercepts.length === 0) {
          // add the corresponding corner
          if (xpos) {
            if (ypos) {
              this._lineTo(this.xmax, this.ymax, true);
            }
            else {
              this._lineTo(this.xmax, this.ymin, true);
            }
          }
          else {
            if (ypos) {
              this._lineTo(this.xmin, this.ymax, true);
            }
            else {
              this._lineTo(this.xmin, this.ymin, true);
            }
          }
        }
        else if ((intercepts.length > 1) && (intercepts[0].ratio > intercepts[1].ratio)) {
          this._lineTo(intercepts[1].x, intercepts[1].y, true);
          this._lineTo(intercepts[0].x, intercepts[0].y, true);
        }
        else {
          for (var i = 0; i < intercepts.length; i++)
            this._lineTo(intercepts[i].x, intercepts[i].y, true);
        }
        this._lineTo(pt2.x, pt2.y, false);
      }
    }
  }
  this._prevIsIn = isIn;
  this._prevPt = new Point(x, y);
};

VectorTileClipper.prototype.closePolygon = function() {
  var firstPt, lastPt;
  if (this.line.length > 0) {
    firstPt = this._firstPt;
    lastPt = this._prevPt;
    if (firstPt.x !== lastPt.x || firstPt.y !== lastPt.y)
      this.lineTo(firstPt.x, firstPt.y);
  }
};

VectorTileClipper.prototype.result = function() {
  // add current line
  this._push_line();

  if (this.lines.length === 0)
    return null;
  return this.lines;
};

VectorTileClipper.prototype._isIn = function(x, y) {
  return x >= this.xmin && x <= this.xmax && y >= this.ymin && y <= this.ymax;
};

VectorTileClipper.prototype._intersect = function(inPt, outPt) {
  var x, y, xRatio, yRatio;

  if (outPt.x >= this.xmin && outPt.x <= this.xmax)
  {
    y = outPt.y <= this.ymin ? this.ymin : this.ymax;
    x = inPt.x + (y - inPt.y) / (outPt.y - inPt.y) * (outPt.x - inPt.x);
  }
  else if (outPt.y >= this.ymin && outPt.y <= this.ymax)
  {
    x = outPt.x <= this.xmin ? this.xmin : this.xmax;
    y = inPt.y + (x - inPt.x) / (outPt.x - inPt.x) * (outPt.y - inPt.y);
  }
  else
  {
    y = outPt.y <= this.ymin ? this.ymin : this.ymax;
    x = outPt.x <= this.xmin ? this.xmin : this.xmax;

    xRatio = (x - inPt.x) / (outPt.x - inPt.x);
    yRatio = (y - inPt.y) / (outPt.y - inPt.y);
    if (xRatio < yRatio)
    {
      y = inPt.y + xRatio * (outPt.y - inPt.y);
    }
    else
    {
      x = inPt.x + yRatio * (outPt.x - inPt.x);
    }
  }
  return new Point(x, y);
};

VectorTileClipper.prototype._push_line = function () {
  if (this.line) {
    if (this.type === 1) { // point
      if (this.line.length > 0)
        this.lines.push(this.line);
    }
    else if (this.type === 2) { // line
      if (this.line.length > 1)
        this.lines.push(this.line);
    }
    else if (this.type === 3) { // polygon
      if (this.line.length > 3)
        this.lines.push(this.line);
    }
  }
  this.line = [];
};

VectorTileClipper.prototype._moveTo = function (x, y, isIn) {
  if (this.type !== 3) {
    if (isIn) {
      x = (x - (this.xmin + this.margin)) * this.finalRatio;
      y = (y - (this.ymin + this.margin)) * this.finalRatio;
      this.line.push(new Point(x, y));
    }
  }
  else {
    // snap points outside of extent
    if (!isIn)
    {
      if (x < this.xmin)
        x = this.xmin;
      if (x > this.xmax)
        x = this.xmax;
      if (y < this.ymin)
        y = this.ymin;
      if (y > this.ymax)
        y = this.ymax;
    }

    // transform
    x = (x - (this.xmin + this.margin)) * this.finalRatio;
    y = (y - (this.ymin + this.margin)) * this.finalRatio;

    this.line.push(new Point(x, y));

    this._is_h = false;
    this._is_v = false;
  }
};

VectorTileClipper.prototype._lineTo = function(x, y, isIn) {
  var lastPt, prevPt;

  if (this.type !== 3) {
    if (isIn) {
      x = (x - (this.xmin + this.margin)) * this.finalRatio;
      y = (y - (this.ymin + this.margin)) * this.finalRatio;
      if (this.line.length > 0) {
        lastPt = this.line[this.line.length - 1];
        if (lastPt.x === x && lastPt.y === y)
          return;
      }
      this.line.push(new Point(x, y));
    }
    else if (this.line && this.line.length > 0) {
      this._push_line();
    }
  }
  else {
    // snap points outside of extent
    if (!isIn)
    {
      if (x < this.xmin)
        x = this.xmin;
      if (x > this.xmax)
        x = this.xmax;
      if (y < this.ymin)
        y = this.ymin;
      if (y > this.ymax)
        y = this.ymax;
    }

    // transform
    x = (x - (this.xmin + this.margin)) * this.finalRatio;
    y = (y - (this.ymin + this.margin)) * this.finalRatio;

    if (this.line && this.line.length > 0) {
      lastPt = this.line[this.line.length - 1];
      var is_h = lastPt.x === x;
      var is_v = lastPt.y === y;
      if (is_h && is_v)
        return;

      if (this._is_h && is_h) {
        lastPt.x = x;
        lastPt.y = y;
        prevPt = this.line[this.line.length - 2]; // valid if this._is_h is true
        this._is_h = prevPt.x === x;
        this._is_v = prevPt.y === y;
      }
      else if (this._is_v && is_v) {
        lastPt.x = x;
        lastPt.y = y;
        prevPt = this.line[this.line.length - 2]; // valid if this._is_v is true
        this._is_h = prevPt.x === x;
        this._is_v = prevPt.y === y;
      }
      else {
        this.line.push(new Point(x, y));
        this._is_h = is_h;
        this._is_v = is_v;
      }
    }
    else {
      this.line.push(new Point(x, y)); // should never happen actually
    }
  }
};
