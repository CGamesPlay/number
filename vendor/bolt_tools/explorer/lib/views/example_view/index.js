var builder = require('bolt/builder');
var core = require('bolt/core');
var util = require('bolt/util');
var View = require('bolt_touch/view').View;

var SingleExampleView = require('../single_example_view').SingleExampleView;
var SplitSingleExampleView = require('../single_example_view').SplitSingleExampleView;


var ExampleView = core.createClass({
  extend: View,

  properties: {
    onwer: null,
    exampleBundle: null
  },

  construct: function(options) {
    View.call(this, options);
  },

  declare: function() {
    return {
      className: 'bt-Exp-Content',
      childViews: [
        {
          ref: 'examples'
        }
      ]
    };
  },

  ready: function() {
    this.getOwner().getLocationHashModel().set(
      'locationHash', 
      this.getExampleBundle().getTitle() + '#'
    );

    var examplesContainer = this.refs.examples;

    util.each(this.getExampleBundle().getExamples(), function(example) {
      examplesContainer.append(builder.build({
        view: SingleExampleView,
        example: example
      }));
    });
  }
});

var SplitExampleView = core.createClass({
  extend: ExampleView,
  //extend: View,

  declare: function() {
    return {
      boxOrientation: 'horizontal',
      className: 'bt-Exp-TripleColumn',
      childViews: [
        {
          className: 'bt-Exp-ExamplesContainer',
          ref: 'examples'
        },
        {
          className: 'bt-Exp-DescriptionSrcContainer',
          ref: 'description_source_container'
        }
      ]
    };
  },

  ready: function() {
    this.getOwner().getLocationHashModel().set(
      'locationHash', 
      this.getExampleBundle().getTitle() + '#'
    );

    var examplesContainer = this.refs.examples;
    var descriptionSrcContainer = this.refs.description_source_container;

    util.each(this.getExampleBundle().getExamples(), function(example) {
      examplesContainer.append(builder.build({
        view: SplitSingleExampleView,
        example: example,
        container: descriptionSrcContainer
      }));
    });
  }
});

exports.ExampleView = ExampleView;
exports.SplitExampleView = SplitExampleView;
