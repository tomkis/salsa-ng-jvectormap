require('jquery-mousewheel')($);
require('jquery-jvectormap');

var GeoChart = require('./GeoChart');
var Tooltip = require('./Tooltip');

angular.module('salsaNgJvectormap', [])
  .directive('salsaNgJvectormap', function() {
    return {
      restrict: 'E',
      scope: {
        'salsaMapVisualisation': '=',
        'salsaMapData': '=',
        'salsaMapHeight': '@',
        'salsaPostponeRendering': '@'
      },
      link: function(scope, el) {
        var tooltip = new Tooltip();

        if (!scope.salsaPostponeRendering) {
          scope.$watch('salsaMapVisualisation', function(visualisation) {
            if (!scope.chart) {
              scope.chart = new GeoChart(el, tooltip, {
                height: scope.salsaMapHeight
              });
            }
            
            scope.chart.updateVisualisationDescription(visualisation);
          });

          scope.$watch('salsaMapData', function(data) {
            if (scope.chart) {
              scope.chart.updateData(data);
            }
          });
        }

        scope.$on('salsaNgGeoChart:updateSize', function() {
          scope.updateSize();
        });

        scope.updateSize = function() {
          if (scope.salsaPostponeRendering) {
            scope.chart = new GeoChart(el, tooltip, {
              height: scope.salsaMapHeight
            });
            scope.chart.updateVisualisationDescription(scope.salsaMapVisualisation);
            scope.chart.updateData(scope.salsaMapData);
          }

          if (scope.chart) {
            scope.chart.updateSize();
          }
        }
      }
    }
  });