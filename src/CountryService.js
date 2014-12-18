var worldMap = require('./data/worldMap.json'),
    smallCountries = require('./data/smallCountries.json'),
    iso31661Alpha3 = require('./data/iso31661Alpha3.json'),
    _ = require('lodash');

var SMALL_COUNTRY_FIELD = 'small';
var countries = null;

module.exports = {

  /**
   * Get all supported world countries (small/visible)
   */
  getCountries: function() {
    if (countries === null) {
      countries = {};
      _.each(smallCountries, function (country, alpha2Code) {
        countries[alpha2Code] = {
          name: country.name,
          latLng: country.latLng,
          alpha2: alpha2Code
        };
        countries[alpha2Code][SMALL_COUNTRY_FIELD] = true;
      });
      _.each(worldMap.paths, function (country, alpha2Code) {
        if (!_.isUndefined(countries[alpha2Code])) {
          throw new Error('Country - ' + alpha2Code + ' is already present in small countries.');
        }

        countries[alpha2Code] = {
          name: country.name,
          alpha2: alpha2Code
        };
        countries[alpha2Code][SMALL_COUNTRY_FIELD] = false;
      });
    }

    return countries;
  },

  /**
   * Get small country according to alpha2 ISO standard
   */
  getSmallCountry: function(alpha2) {
    return _.extend({
      code: alpha2
    }, smallCountries[alpha2]);
  },

  /**
   * Check whether alpha2 code country is listend in our list of small countries
   */
  isSmallCountry: function(alpha2) {
    return !_.isUndefined(smallCountries[alpha2]);
  },

  /**
   * Gets country name according to Alpha2 ISO code
   */
  getCountryName: function(alpha2) {
    return module.exports.getCountries()[alpha2].name;
  },

  /**
   * Predicate that checks whether provided country by getCountries() is small
   */
  isVisibleCountryPredicate: function(country) {
    return !country[SMALL_COUNTRY_FIELD];
  },


  /**
   * Returns JSON for SVG map creation in jVectorMap
   */
  getWorldMapForJVectorMap: function() {
    return worldMap;
  },

  /**
   * Helper method to obtain Alpha2 code (flxone-dashboard uses this standard) by Alpha3 code (flxone API provides this standard)
   *
   * @param alpha3 ISO-3166-1 Alpha2 country code
   * @returns ISO-3166-1 Alpha3 country code
   */
  getIso31661Alpha2ByAlpha3: function(alpha3) {
    var alpha2 = iso31661Alpha3[alpha3];

    if (!alpha2) {
      throw new Error('Invalid alpha3 code - ' + alpha3);
    } else {
      return alpha2;
    }
  }

};