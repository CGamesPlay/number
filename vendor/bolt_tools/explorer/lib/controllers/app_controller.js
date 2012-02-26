var core    = require('bolt/core');
var util    = require('bolt/util');
var builder = require('bolt/builder');

var ExampleBundleNodeModel = require('../models/example_bundle_node_model').ExampleBundleNodeModel;
var LandingView            = require('../views/landing_view').LandingView;
var Model                  = require('bolt/model').Model;

var AppController = core.createClass({
  properties: {
    exampleBundle: null,
    locationHashModel: null,
    columns: 0
  },

  construct: function(options) {
    this._setupLocationHash();

    var hash_path = this.getLocationHashModel().get('locationHash');

    this._initExampleBundle(options.modules);

    // builds the view smartly
    this._initView();

    this.view.navigateHashPath(hash_path);

    this.view.setBinding(this.getLocationHashModel(), { property: 'locationHash' });

    document.addEventListener(
      'DOMContentLoaded',
      util.bind(this._onContentLoaded, this)
    );

    window.addEventListener(
      'resize',
      util.bind(this._onResize, this)
    );
  },

  _initView: function() {
    var w = document.body.offsetWidth,
        c = this.getColumns();

    if (w < 920) {
      this.view = new LandingView({
        exampleBundle: this.getExampleBundle(),
        locationHashModel: this.getLocationHashModel(),
        columns: 1
      });
      this.setColumns(1);
    } else if (w < 1460) {
      this.view = new LandingView({
        exampleBundle: this.getExampleBundle(),
        locationHashModel: this.getLocationHashModel(),
        columns: 2
      });
      this.setColumns(2);
    } else {
      this.view = new LandingView({
        exampleBundle: this.getExampleBundle(),
        locationHashModel: this.getLocationHashModel(),
        columns: 3
      });
      this.setColumns(3);
    }
    if (navigator.userAgent.match(/iPhone/)) {
      var scaleFactor = .593;
      this.view.setStyle({
        webkitTransform: 'scale(' + scaleFactor + ')',
        webkitTransformOrigin: '0 0',
        height: document.body.clientHeight / scaleFactor + 'px'
      });
    }
  },

  _onResize: function(event) {
    var w = document.body.offsetWidth,
        c = this.getColumns();

    if (w >= 1460 && c !== 3) {
      window.location.reload();
    } else if (w >= 920 && w < 1460 && c !== 2) {
      window.location.reload();
    } else if (w < 920 && c !== 1) {
      window.location.reload();
    }
  },

  _setupLocationHash: function() {
    if (window.location.hash === '') {
      window.location.hash = 'Root';
    }

    this.setLocationHashModel(new Model({
      locationHash: window.location.hash
    }));

    this.getLocationHashModel().listen('changed', function(event) {
      window.location.hash = event.model.get('locationHash');
    }, null);
  },

  _onContentLoaded: function(event) {
    this.view.placeIn(document.body);
  },

  _initExampleBundle: function(modules) {
    var bundle = new ExampleBundleNodeModel({ parent: null });
    var path = 'Root';
    bundle.setTitle(path);

    var build_branch = function(bundle_dir) {
      var child = new ExampleBundleNodeModel({ parent: bundle });
      child.setTitle(path + '/' + bundle_dir);
      path = child.getTitle();

      bundle = bundle.addChild(bundle_dir, child);
    };

    // parses individual example in module
    var process_example = function(example) {
      var bundle_dirs = (example.bundle && example.bundle.split('/')) || ['Untitled'];
      var root = bundle;
      util.each(bundle_dirs, build_branch);
      path = 'Root';

      bundle.getExamples().push({
        code: example.code,
        description: example.description
      });

      bundle = root;
    };

    util.each(modules, function(module_title) {
      var module = require.call(null, module_title);
      util.each(module.examples, process_example);
    });

    this.setExampleBundle(bundle);
  }
});

exports.AppController = AppController;
