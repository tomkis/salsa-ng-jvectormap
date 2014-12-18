var CountryService = require('./CountryService'),
    BucketScale = require('./BucketScale'),
    Template = require('./templates/geo-chart.hbs'),
    TemplateSeries = require('./templates/geo-chart-series.hbs'),
    _ = require('lodash');

/**
 * Encapsulates jVectorMap, adds custom Scale and small countries support.
 *
 * @param selector HTML selector for which the chart is constructed
 * @param tooltip Tooltip
 * @param cfg object overriding
 * @constructor
 */
var GeoChart = function(selector, tooltip, cfg) {
  // we need to add actual SVG data for the map
  var MAP_NAME = 'world_mill_en';
  $.fn.vectorMap('addMap', MAP_NAME, CountryService.getWorldMapForJVectorMap());

  // dependency on Tooltip
  this.tooltip = tooltip;

  // Active series is index for current active data series
  this.activeSeries = 0;
  this.selector = selector;

  // configuration object for the map, can be overridden
  cfg = cfg || {};
  this.chartConfig = _.extend({
    backgroundColor: '#fff',
    zoomMax: 4.096,
    height: 340,
    markers: {
      rScale: {
        min: 4,
        max: 7
      }
    }
  }, cfg);

  this.container = $(this.selector);
  this._updateTemplate({});

  // When jVectorMap is created it has to include at least some dummy data for series and markers
  // otherwise exception is thrown. It does not matter what data are set because they are overridden
  // by custom behaviour of GeoChart.
  this.el.vectorMap({
    map: MAP_NAME,
    backgroundColor: this.chartConfig.backgroundColor,
    zoomMax: this.chartConfig.zoomMax,
    zoomOnScroll: true,
    onRegionTipShow: _.bind(this.onTooltipShow, this),
    onRegionOut: _.bind(this.onTooltipHide, this),
    onMarkerTipShow: _.bind(this.onMarkerShow, this),
    onMarkerOut: _.bind(this.onTooltipHide, this),
    series: {
      regions: [{
        min: 0,
        max: 0,
        scale: ['#000', '#000'],
        values: []
      }],
      markers: [{
        attribute: 'fill',
        values: [],
        scale: ['#000', '#000'],
        min: 0,
        max: 0
      },{
        attribute: 'r',
        values: [],
        scale: [0, 0],
        min: 0,
        max: 0
      }]
    }
  });

  this.map = this.el.vectorMap('get', 'mapObject');
  this.container.on('click', '.series-switch', _.bind(this.onSeriesSwitchClick, this));
  this.container.on('mousemove', _.bind(this.onMouseMove, this));
};

/**
 * Mouse move is intercepted to show our custom tooltip. Default jVectorMap tooltip is hidden as it behaves oddly.
 */
GeoChart.prototype.onMouseMove = function(ev) {
  // In the hoveredCountry variable is either null (if no country is hovered) or Alpha2 code of the country (jVectorMap callbacks
  // are responsible for proper filling of the variable.
  if (this.hoveredCountry) {
    // little boost to avoid overhead by setting description anytime mouse moves
    if (this.previousHoveredCountry !== this.hoveredCountry) {
      var description = this.visualisationDescription[this.activeSeries].renderer(this.hoveredCountry); // we use custom rendered from visualisation description to render value
      if (description.length > 0) {
        this.tooltip.setDescription(description);
      }
    }

    this.tooltip.showAt(ev.pageX - 25, ev.pageY - 3); // 25, 3 are constants staying for proper alignment with the cursor
    this.previousHoveredCountry = this.hoveredCountry;
  }

  return true;
};

/**
 * Callback invoked when user hovers over marker. This is just jVectorMap delegate
 */
GeoChart.prototype.onMarkerShow = function(event, el, code) {
  // this callback provides just index to jVectorMap markers array, we need to normalize it to Alpha-2 country code
  this.hoveredCountry = this.data[this.activeSeries].markersMeta[code].code;
};

/**
 * Callback invoked when user hovers over region. This is just jVectorMap delegate
 */
GeoChart.prototype.onTooltipShow = function(event, el, code) {
  this.hoveredCountry = code;
};

/**
 * Callback invoked when user hovers out of the marker or tooltip. This is just jVectorMap delegate
 */
GeoChart.prototype.onTooltipHide = function() {
  this.hoveredCountry = null;
  this.tooltip.hide();
};

/**
 * Callback invoked when user clicks on the different data series item
 */
GeoChart.prototype.onSeriesSwitchClick = function(ev) {
  var el = $(ev.target);
  var seriesIndex = parseInt(el.attr('series-index'), 10);

  this.container.find('.series-switch').removeClass('selected');
  el.addClass('selected');

  this.changeSeries(seriesIndex);
};

/**
 * Changes series in the chart -> redraws map
 * @param series Integer data series index
 */
GeoChart.prototype.changeSeries = function(series) {
  this.activeSeries = series;
  this._setDataToMapAndRedraw(this.data[series]);
};

/**
 * Updates visualisation description of the map, input must correspond with {@link GeoChart.prototype.updateData} as each
 * element of array describes visual component of the series
 *
 * @param visualisationDescription Array|Object if object is provided 1-length array is automatically created
 */
GeoChart.prototype.updateVisualisationDescription = function(visualisationDescription) {
  var arrVisualization;
  if (_.isArray(visualisationDescription)) {
    arrVisualization = visualisationDescription;
  } else {
    arrVisualization = [visualisationDescription];
  }

  this.visualisationDescription = [];
  _.each(arrVisualization, _.bind(function(visualisation) {
    var colorScale = new BucketScale();
    colorScale.setNumberOfBuckets(visualisation.buckets);
    colorScale.setNullValue(visualisation.nullValueColour);
    colorScale.setRange(visualisation.scale.min, visualisation.scale.max); // colour scale
    colorScale.setScaleFunction(visualisation.scaleFn);

    var radiusScale = new BucketScale();
    radiusScale.setNumberOfBuckets(visualisation.buckets); // we use same number of buckets for color and radius scale
    radiusScale.setNullValue(0);
    radiusScale.setRange(this.chartConfig.markers.rScale.min, this.chartConfig.markers.rScale.max); // numeric scale
    radiusScale.setScaleFunction(visualisation.scaleFn); // we use same scale fn for color and radius scale

    this.visualisationDescription.push({
      colorScale: colorScale,
      radiusScale: radiusScale,
      renderer: visualisation.renderer, // function to be called for rendering tooltip
      label: visualisation.label // label to be shown in data series list
    });
  }, this));
};

/**
 * GeoChart allows to use series of data, we can add multiple data series at once and then just switch between them
 * by calling {@link GeoChart.prototype.changeSeries}
 *
 * @param dataSeries array|object with the key being an ISO3166-1 Alpha2 code and integer value, if object is provided 1-length array is automatically created
 */
GeoChart.prototype.updateData = function(dataSeries) {
  // we make sure input is an array
  var arrData;
  if (_.isArray(dataSeries)) {
    arrData = dataSeries;
  } else {
    arrData = [dataSeries];
  }

  // visualisation description must match data series
  if (!this.visualisationDescription || !this.visualisationDescription.length || this.visualisationDescription.length !== arrData.length) {
    throw new Error('Visualisation description does not correspond to supplied data. Please update visualisation description prior to updating data');
  }

  this.data = [];
  _.each(arrData, _.bind(function(populateData) {
    var splitCountriesPopulateData = this._splitDataToSmallCountriesAndVisibleCountries(populateData);

    // List containing all visible countries on the map, even when they are not present in provided data, so that we can see all countries on the map
    var populatedVisibleCountries = _.extend(this._prepareEmptyVisibleCountriesDataSet(), splitCountriesPopulateData.visibleCountries);

    // We need to filter out all small countries that don't have data because we don't want to see markers for small countries without data
    var markersMeta = [], // Position on the map and name of small country
        markersValues = []; // Actual value for the small country
    _.each(splitCountriesPopulateData.smallCountries, function(value, alpha2) {
      if (value !== 0) {
        markersMeta.push(CountryService.getSmallCountry(alpha2));
        markersValues.push(value);
      }
    });

    // We also store the max value so that we don't need to recalculate it with each map redrawing
    this.data.push({
      populatedVisibleCountries: populatedVisibleCountries,
      populatedVisibleCountriesMax: _.max(populatedVisibleCountries),
      markersMeta: markersMeta,
      markersValues: markersValues,
      markersValuesMax: markersValues.length > 0  ? _.max(markersValues) : 0
    });
  }, this));

  this._updateTemplate(this._getSeriesLabels());
  this.changeSeries(this.activeSeries);
};

/**
 * Updates or creates template for the map, template consists of map-wrapper and series-wrapper.
 * Map wrapper is created only first time this method is called and series-wrapper is updated always.
 * @param series Array containing series labels
 */
GeoChart.prototype._updateTemplate = function(series) {

  // if there is no el variable we create initial template otherwise we just update series template
  if (!this.el) {
    this.container.html(Template({
      height: this.chartConfig.height
    }));
    this.el = this.container.find('.map-wrapper');
    this.seriesEl = this.container.find('.series-wrapper');
  }

  this.seriesEl.html(TemplateSeries(series));
};

/**
 * Get array of labels.
 *
 * @returns Array of series labels
 */
GeoChart.prototype._getSeriesLabels = function() {
  if (this.visualisationDescription.length > 1) {
    return _.pluck(this.visualisationDescription, 'label');
  } else {
    return [];
  }
};

/**
 * Sets data to chart and redraws it
 */
GeoChart.prototype._setDataToMapAndRedraw = function(populateData) {
  var colorScale = this.visualisationDescription[this.activeSeries].colorScale,
      radiusScale = this.visualisationDescription[this.activeSeries].radiusScale;

  // set scale & values for region colors
  colorScale.setExtremeValues(0, Math.max(populateData.markersValuesMax, populateData.populatedVisibleCountriesMax)); // makes sense to have one color scale for markers and regions
  colorScale.calculateBuckets();
  this.map.series.regions[0].scale = colorScale;
  this.map.series.regions[0].setValues(populateData.populatedVisibleCountries);

  // we remove all markers and re-populate them
  this.map.removeAllMarkers();
  this.map.createMarkers(populateData.markersMeta);

  this.map.series.markers[0].scale = colorScale;
  this.map.series.markers[0].setValues(populateData.markersValues);

  // set scale & values for marker radius
  radiusScale.setExtremeValues(0, populateData.markersValuesMax);
  radiusScale.calculateBuckets();
  this.map.series.markers[1].scale = radiusScale;
  this.map.series.markers[1].setValues(populateData.markersValues);

  // just to be sure map fits its parent
  this.map.updateSize();
};

/**
 * This method takes list of all countries and splits them between small and visible countries.
 *
 * @param data list of all countries
 * @returns {{smallCountries: {}, visibleCountries: {}}}
 */
GeoChart.prototype._splitDataToSmallCountriesAndVisibleCountries = function(data) {
  var smallCountries = {},
      visibleCountries = {};

  _.each(data, function(value, alpha2) {
    if (CountryService.isSmallCountry(alpha2)) {
      smallCountries[alpha2] = value;
    } else {
      visibleCountries[alpha2] = value;
    }
  });

  return {
    smallCountries: smallCountries,
    visibleCountries: visibleCountries
  };
};

/**
 * Creates empty object containing all visible countries as a key with value of -1 representing empty value
 */
GeoChart.prototype._prepareEmptyVisibleCountriesDataSet = function() {
  var emptyData = {};
  _.each(_.filter(CountryService.getCountries(), CountryService.isVisibleCountryPredicate), function(country) {
    emptyData[country.alpha2] = -1; // Minus one stands for NULL value, because jVectorMap throws exception when using null
  });

  return emptyData;
};

module.exports = GeoChart;