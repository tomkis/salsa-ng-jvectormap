var _ = require('lodash');

var Tooltip = function() {
  this.triangleOffset = 10;

  $('body').append(require('./templates/tooltip.hbs')());

  this.tooltip = $('.chart-tooltip');
};

Tooltip.prototype.setDescription = function(description) {
  var content = _.reduce(description, function(memo, item) {
    return memo + '<p>' + item + '</p>';
  }, '');

  this.tooltip.find('.tooltip-content').html(content);
};

Tooltip.prototype.showAtBottom = function(x, y) {
  this.tooltip.css('left', x);
  this.tooltip.css('top', y - this.tooltip.height());
  this.tooltip.show();
};

Tooltip.prototype.showAt = function(x, y) {
  this.tooltip.css('left', x + this.triangleOffset);
  this.tooltip.css('top', y - this.tooltip.height());
  this.tooltip.show();
};

Tooltip.prototype.hide = function() {
  this.tooltip.hide();
};

module.exports = Tooltip;