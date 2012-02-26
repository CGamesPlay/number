var builder = require('bolt/builder');
var core = require('bolt/core');
var View = require('bolt_touch/view').View;
var HasEventListeners = require('bolt_touch/mixins/has_event_listeners').HasEventListeners;

var highlight = require('third_party/highlightjs/highlight');

// Takes a function and returns the source as highlighted html.
function functionToHtml(fn) {
  var source = fn.toString();
  var lines = fn.toString().split('\n');
  // drop function(container) {
  lines.shift();

  // drop }
  lines.pop();
  while (lines[0].length === 0) {
    // drop empty lines at the beginning
    lines.shift();
  }
  while (lines[lines.length - 1].length === 0) {
    // drop empty lines at the end
    lines.pop();
  }
  var indent = lines[0].match(/^\s*/)[0].length;
  source = lines.join('\n');
  var unindent = new RegExp('^[ \\t]{0,' + indent + '}', 'gm');
  source = source.replace(unindent, '');
  
  return highlight('javascript', source).value;
}

var SingleExampleView = core.createClass({
  extend: View,

  mixins: [HasEventListeners],

  declare: function(options) {
    return {
      eventListeners: {
        'click a.bt-Exp-ShowSource': 'showSource',
        'click a.bt-Exp-ShowDescription': 'showDescription'
      },

      className: 'bt-Exp-ExampleContainer',
      childViews: [
        {
          className: 'bt-Exp-Result',
          ref: 'result'
        },
        {
          className: 'bt-Exp-ExpandLinkContainer',
          childViews: [
            {
              className: 'bt-Exp-ExpandLink bt-Exp-ShowSource',
              tagName: 'a',
              content: 'Source'
            },
            {
              className: 'bt-Exp-ExpandLink bt-Exp-ShowDescription',
              tagName: 'a',
              content: 'Description'
            }
          ]
        },
        { ref: 'source' },
        { ref: 'description' },
      ]
    };
  },

  buildSourceBox: function(container) {
    if (this.sourceBox) {
      return;
    }

    this.sourceBox = builder.build({
      childViews: [
        {
          content: 'Source:',
          className: 'bt-Exp-DetailBoxTitle'
        },
        {
          tagName: 'pre',
          ref: 'contents',
          className: 'bt-Exp-Source highlightjs'
        }
      ]        
    });
    
    this.sourceBox.toggle();
    this.sourceBox.refs['contents'].setDangerouslyInjectedHtml(
      functionToHtml(this.source)
    );

    container.append(this.sourceBox);
  },

  buildDescriptionBox: function(container) {
    if (this.descriptionBox) {
      return;
    }

    this.descriptionBox = builder.build({
      childViews: [
        {
          content: 'Description:',
          className: 'bt-Exp-DetailBoxTitle'
        },
        {
          ref: 'contents',
          className: 'bt-Exp-Source bt-Exp-Description'
        }
      ]
    });

    this.descriptionBox.refs['contents'].setContent(this.example.description);
    this.descriptionBox.toggle();

    container.append(this.descriptionBox);
  },

  showSource: function() {
    this.buildSourceBox(this.refs['source']);
    this.sourceBox.toggle();
  },

  showDescription: function() {
    this.buildDescriptionBox(this.refs['description']);
    this.descriptionBox.toggle();
  },

  setSource: function(source) {
    this.source = source;
  },

  setExample: function(example) {
    this.example = example;

    try {
      // run the function to build the example
      example.code(this.refs.result);
    } catch (e) {
      this.refs.result.setContent(e.toString());
    }

    this.setSource(example.code);
  }
});

var SplitSingleExampleView = core.createClass({
  extend: SingleExampleView,

  construct: function(options) {
    this.container = options.container;

    SingleExampleView.call(this, options);
  },

  declare: function() {
    return {
      eventListeners: {
        'click a.bt-Exp-ShowSource': 'showSource',
        'click a.bt-Exp-ShowDescription': 'showDescription'
      },
      
      className: 'bt-Exp-ExampleContainer',
      childViews: [
        {
          className: 'bt-Exp-Result',
          ref: 'result'
        },
        {
          className: 'bt-Exp-ExpandLinkContainer',
          childViews: [
            {
              className: 'bt-Exp-ExpandLink bt-Exp-ShowSource',
              tagName: 'a',
              content: 'Source'
            },
            {
              className: 'bt-Exp-ExpandLink bt-Exp-ShowDescription',
              tagName: 'a',
              content: 'Description'
            }
          ]
        }
      ]
    };
  },

  showSource: function() {
    this.buildSourceBox(this.container);
    this.sourceBox.toggle();
  },

  showDescription: function() {
    this.buildDescriptionBox(this.container);
    this.descriptionBox.toggle();
  }
});

exports.SingleExampleView = SingleExampleView;
exports.SplitSingleExampleView = SplitSingleExampleView;
