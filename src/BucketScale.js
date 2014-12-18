var TinyColor = require('tinycolor2'),
    _ = require('lodash');

/**
 * This class holds interface for jVectorMap scale, though its methods are not used (they shouldn't even be). The class
 * implements only {@link BucketScale.prototype.getValue} which is base method used for mapping the actual value on scale.
 * @constructor
 */
var BucketScale = function() {};

// These three methods are present for only keeping an interface
BucketScale.prototype.setMin = function() {};
BucketScale.prototype.setMax = function() {};
BucketScale.prototype.setScale = function() {};

/**
 * Maps value to scale
 *
 * @param val
 * @returns Number|String interpolated numeric value or hexadecimal colour
 */
BucketScale.prototype.getValue = function(val) {
  // -1 stands for null value, see {@link GeoChart.prototype._prepareEmptyVisibleCountriesDataSet} for explanation
  if (val === -1) {
    if (this.nullValue) {
      return this.nullValue;
    } else {
      return this.range.min;
    }
  }
  // just find proper bucket for value and return its interpolated value
  var bucket = _.find(this.buckets, function(bucket) {
    return bucket.min <= val && bucket.max >= val;
  });

  return bucket.val;
};

/**
 * @param minimum Minimal value from data set
 * @param maximum Maximal value from data set
 */
BucketScale.prototype.setExtremeValues = function(minimum, maximum) {
  if (!_.isNumber(minimum) || !_.isNumber(maximum)) {
    throw new Error('Extreme values must be numbers');
  }

  if (minimum > maximum) {
    throw new Error('Minimum may not be greater than maximum');
  }

  this.extremeValues = [minimum, maximum];
};

/**
 * Range to be interpolated, may be colours or numeric values
 */
BucketScale.prototype.setRange = function(min, max) {
  this.range = {
    min: min,
    max: max
  };

  // we should store the state whether we interpolate colours or numbers
  if (this._isValidColor(min) && this._isValidColor(max)) {
    this.colors = true;
  } else if (_.isNumber(min) && _.isNumber(max)) {
    this.colors = false;
  } else {
    throw new Error('Invalid extreme values provided. Either Number or color string is allowed');
  }
};

BucketScale.prototype.setNumberOfBuckets = function(numberOfBuckets) {
  this.numberOfBuckets = numberOfBuckets;
};

/**
 * This value is returned if -1 is requested by calling {@link BucketScale.prototype.getValue}
 */
BucketScale.prototype.setNullValue = function(value) {
  this.nullValue = value;
};

/**
 * Set function to be used for interpolating bucket ranges
 *
 * @param scaleFn String|Function string linear or log may be provided, also custom scale function may be provided
 */
BucketScale.prototype.setScaleFunction = function(scaleFn) {
  if (_.isFunction(scaleFn)) {
    this.scaleFn = scaleFn;
  } else {
    switch (scaleFn) {
      case 'linear':
        this.scaleFn = this._scaleLinear;
        break;
      case 'log':
        this.scaleFn = this._scaleLogarithmic;
        break;
      default:
        throw new Error('Unknown scale fn ' + scaleFn);
    }
  }
};

/**
 * Anytime any visual parameter or extremeValues changes this method should be called in order to properly recalculate bucket ranges
 * and corresponding interpolated values for buckets (
 */
BucketScale.prototype.calculateBuckets = function() {
  var min = this.range.min,
      max = this.range.max;

  this.buckets = [];

  for (var i = 0; i < this.numberOfBuckets; i++) {
    var bucket = {};

    if (this.colors) {

      var mixPercentage;
      if (this.numberOfBuckets === 1) {
        mixPercentage = 50; // 50% mix of min and max for single bucket
      } else {
        mixPercentage = (i / (this.numberOfBuckets - 1)) * 100;
      }

      bucket.val = TinyColor.mix(min, max, mixPercentage).toHexString();
    } else {
      bucket.val = this._scaleLinear(min, max, this.numberOfBuckets, i);
    }

    bucket.min = this.scaleFn(this.extremeValues[0], this.extremeValues[1], this.numberOfBuckets, i);
    bucket.max = this.scaleFn(this.extremeValues[0], this.extremeValues[1], this.numberOfBuckets, i + 1);

    this.buckets[i] = bucket;
  }
};

BucketScale.prototype._isValidColor = function(str) {
  return TinyColor(str).isValid();
};

/**
 * Standard LERP {@link http://en.wikipedia.org/wiki/Linear_interpolation} using Steps/Step instead of fraction
 *
 * @param min Minimal value
 * @param max Maximal value
 * @param steps Number of steps
 * @param step Step to be interpolated
 */
BucketScale.prototype._scaleLinear = function(min, max, steps, step) {
  return (((max - min) / steps) * step) + min;
};

/**
 * Logarithmic scale - scales values in range of min-max logarithmically
 * @param min Minimal value
 * @param max Maximal value
 * @param steps Number of steps
 * @param step Step to be interpolated
 */
BucketScale.prototype._scaleLogarithmic = function(min, max, steps, step) {
  // just to keep stuff simple -> we will treat extreme values separately
  if (step === 0) {
    return min;
  } else if (step === (steps - 1)) {
    return max;
  } else {
    return Math.pow(10, Math.log10((max - min) / steps * step + 1)) + min - 1;
  }
};

module.exports = BucketScale;