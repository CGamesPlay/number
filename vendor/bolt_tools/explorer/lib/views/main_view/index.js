var builder = require('bolt/builder');
var core = require('bolt/core');
var util = require('bolt/util');

var SceneStack = require('bolt_touch/views/scene_stack').SceneStack;
var Scene = require('bolt_touch/views/scene').Scene;
var TableView = require('bolt_touch/views/table_view').TableView;
var TableViewCell = require('bolt_touch/views/table_view').TableViewCell;
var View = require('bolt_touch/view').View;

var ExampleView = require('../example_view').ExampleView;

var MainView = core.createClass({
  extend: View,

  properties: {
    exampleBundle: null,
    locationHashModel: null,
    backButton: null,
    inExampleView: false
  },

  showChildBundle: function(bundle, options) {
    if (!bundle.isRoot()) {
      this.getBackButton().show();
    }

    this.setExampleBundle(bundle);
    this.refs.scene_stack.push({
      view: ExampleListScene,
      owner: this
    }, options);
  },

  setBackButton: function(backButton) {
    this.set('backButton', backButton);

    this.getBackButton().setAction(util.bind(this.backButtonPressed, this));
    this.getBackButton().hide();
  }
});

var SingleColumnMainView = core.createClass({
  extend: MainView,

  declare: function() {
    return {
      flex: 1,
      className: 'bt-Exp-SingleColumnMainView',
      childViews: [
        {
          view: SceneStack,
          flex: 1,
          className: 'bt-Exp-SingleColumnSceneStack',
          ref: 'scene_stack',
          disableHeaders: true
        }
      ]
    }
  },

  showExampleView: function(bundle, options) {
    if (!bundle.isRoot()) {
      this.getBackButton().show();
    }

    this.setInExampleView(true);

    this.refs.scene_stack.push(builder.build({
      view: Scene,
      childViews: [
        {
          view: ExampleView,
          exampleBundle: bundle,
          owner: this
        }
      ]
    }), options);
  },
  
  backButtonPressed: function() {
    if (this.getInExampleView()) {
      this.setInExampleView(false);
    } else {
      this.setExampleBundle(
        this.getExampleBundle().getParent());      
    }

    if (this.getExampleBundle().isRoot()) {
      // we're in the root, let's hide the back button
      this.getBackButton().hide();
    }

    this.refs.scene_stack.pop();
  },
});

var MultiColumnMainView = core.createClass({
  extend: MainView,

  properties: {
    exampleViewClass: null
  },
  
  declare: function(options) {
    return {
      flex: 1,
      className: options.className,
      boxOrientation: 'horizontal',
      childViews: [
        {
          view: SceneStack,

          className: 'bt-Exp-MultiColumnSceneStack',
          ref: 'scene_stack',
          disableHeaders: true
        },
        {
          boxOrientation: 'vertical',
          className: 'bt-Exp-MultiColumnExampleContainer',
          ref: 'example_container'
        }
      ]
    }
  },

  showExampleView: function(bundle, options) {
    if (!bundle.isRoot() && !bundle.getParent().isRoot()) {
      this.getBackButton().show();
    }

    this.setInExampleView(true);

    this.refs.example_container.setChildViews([
      builder.build({
        flex: 1,
        view: this.getExampleViewClass(),
        exampleBundle: bundle,
        owner: this
      })
    ]);
  },
  
  backButtonPressed: function() {
    if (this.getInExampleView()) {
      // back in an example view just hides 
      this.setInExampleView(false);
    }

    this.setExampleBundle(
      this.getExampleBundle().getParent());      

    if (this.getExampleBundle().isRoot()) {
      // we're in the root, let's hide the back button
      this.getBackButton().hide();
    }

    this.refs.scene_stack.pop();
  }
});

var ExampleListScene = core.createClass({
  extend: Scene,

  properties: {
    owner: null,
    exampleBundle: null
  },

  construct: function(options) {
    Scene.call(this, options);

    // we need a separate reference for the bundle at creation time,
    // since the owner always looks at the leaf node, whereas each scene
    // must look at a different node in the path being traversed
    this.setExampleBundle(this.getOwner().getExampleBundle());
  },

  declare: function(options) {
    return {
      boxOrientation: 'vertical',
      childViews: [
        {
          flex: 1,
          view: TableView,
          sectioned: false,      
          fixedRowHeight: 50,
          ref: 'table_view'
        }
      ]
    }
  },

  numberOfRowsInSection: function(tableView, section) {
    var bundle = this.getExampleBundle();

    var result = 0;
    if (bundle.isPopulated()) {
      result = bundle.getChildTitles().length + 1;
    } else {
      result = bundle.getChildTitles().length;
    }

    return result;
  },
  
  cellForRowInSection: function(tableView, row, section) {
    var bundle = this.getExampleBundle();

    if (bundle.isPopulated()) { 
      row -= 1; 
    }

    var cell = tableView.dequeueReusableCellWithIdentifier('bundle_cell');
    if (!cell) {
      cell = new TableViewCell({
        reuseIdentifier: 'bundle_cell',
        owner: this,
        accessoryType: 'arrow'
      });
    }

    var example_count = undefined;

    if (row === -1) {
      // accessor to the examples in this bundle
      example_count = bundle.getExamples().length;
    } else if (bundle.childByIdx(row).isLeaf()) {
      // accessor to examples in a leaf
      example_count = bundle.childByIdx(row).getExamples().length;
    }
    
    var title = (row === -1) ? bundle.getTitle() : 
      bundle.getChildTitles()[row];
    
    cell.setTitle(title);
    if (example_count !== undefined) {
      cell.setAccessoryTitle(example_count);
    }

    return cell;
  },

  cellSelectedAtRowInSection: function(tableView, row, section, cell) {
    var bundle = this.getExampleBundle();

    if (bundle.isPopulated()) { 
      row -= 1; 
    }
    
    if (row === -1) {
      // row to show the examples for this current bundle
      this.getOwner().showExampleView(bundle);
      return;
    }

    bundle = bundle.childByIdx(row);

    if (bundle.isLeaf()) {
      this.getOwner().showExampleView(bundle);
    } else {
      this.getOwner().showChildBundle(bundle);
    }
  },

  activate: function() {
    this.refs.table_view.clearSelection();
    this.getOwner().getLocationHashModel().set('locationHash', this.getExampleBundle().getTitle());
  }
});

exports.SingleColumnMainView = SingleColumnMainView;
exports.MultiColumnMainView = MultiColumnMainView;
