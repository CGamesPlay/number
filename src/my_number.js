var Backbone = require('backbone');

var MyNumber = exports.MyNumber = Backbone.Model.extend({
  urlRoot: '/numbers',
});

exports.MyNumberCollection = Backbone.Collection.extend({
  model: MyNumber,
  url: '/all_numbers',

  parse: function(results) {
    results.sort(function(a, b) {
      return a.number - b.number;
    });
    return results;
  }
});
