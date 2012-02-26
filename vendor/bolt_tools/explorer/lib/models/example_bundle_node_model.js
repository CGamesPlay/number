var core = require('bolt/core');

var ExampleBundleNodeModel = core.createClass({
  properties: {
    parent: null,
    children: null,
    childTitles: null,
    title: 'Untitled',
    examples: null
  },

  construct: function(options) {
    this.setParent(options.parent || null);
    this.setChildren(options.children || {});
    this.setChildTitles([]);
    this.setExamples([]);
  },

  isRoot: function() {
    return (this.getParent() === null);
  },

  isLeaf: function() {
    return (this.getChildTitles().length === 0);
  },

  isPopulated: function() {
    return (this.getExamples().length !== 0);
  },

  childByTitle: function(child_title) {
    return this.getChildren()[child_title];
  },

  childByIdx: function(child_idx) {
    return this.getChildren()[this.getChildTitles()[child_idx]];
  },

  addChild: function(child_title, child) {
    if (this.childByTitle(child_title) === undefined) {
      this.getChildren()[child_title] = child;
      this.getChildTitles().push(child_title);
    }

    return this.childByTitle(child_title);
  }
});



exports.ExampleBundleNodeModel = ExampleBundleNodeModel;
