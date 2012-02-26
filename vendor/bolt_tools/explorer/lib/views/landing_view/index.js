var core = require('bolt/core');
var util = require('bolt/util');

var Button = require('bolt_touch/views/button').Button;
var View = require('bolt_touch/view').View;

var SplitExampleView     = require('../example_view').SplitExampleView;
var ExampleView          = require('../example_view').ExampleView;

var MultiColumnMainView  = require('../main_view').MultiColumnMainView;
var SingleColumnMainView = require('../main_view').SingleColumnMainView;

var ExampleBundleNodeModel = require('../../models/example_bundle_node_model').ExampleBundleNodeModel;

var LandingView = core.createClass({
  extend: View,

  properties: {
    locationHash: '',
    exampleBundle: null,
    locationHashModel: null
  },

  construct: function(options) {
    View.call(this, options);
  },

  declare: function(options) {
    var width = document.body.offsetWidth;
    var boltKlass, domKlass;
    var mainView = {
      exampleBundle: options.exampleBundle,
      locationHashModel: options.locationHashModel,
      ref: 'main_view'
    };

    switch(options.columns) {
    case 1: {
      mainView.view = SingleColumnMainView;
      domKlass = 'bt-Exp-ChromeBarTitle';
    } break;
    case 2: {
      mainView.view = MultiColumnMainView;
      mainView.className = 'bt-Exp-DoubleColumnMainView';
      mainView.exampleViewClass = ExampleView;
      domKlass = 'bt-Exp-ChromeBarTitle bt-Exp-ChromeBarDouble';
    } break;
    case 3: {
      mainView.view = MultiColumnMainView;
      mainView.className = 'bt-Exp-TripleColumnMainView';
      mainView.exampleViewClass = SplitExampleView;
      domKlass = 'bt-Exp-ChromeBarTitle bt-Exp-ChromeBarTriple';
    } break;
    }

    return {
      className: 'bt-Exp-MainContainer',
      boxOrientation: 'vertical',
      childViews: [
        {
          // header chrome
          className: 'bt-Exp-ChromeBar',
          childViews: [
            {
              boxOrientation: 'horizontal',
              className: domKlass,
              childViews: [
                {
                  className: 'bt-Exp-ChromeBarTitleIcon'
                },
                {
                  className: 'bt-Exp-ChromeBarTitleSeparator'
                },
                {
                  className: 'bt-Exp-ChromeBarTitleName',
                  content: 'BoltExplorer'
                },
                {
                  flex: 1
                },
                {
                  view: Button,
                  value: 'Back',
                  ref: 'back_button',
                }
              ]
            }
          ]
        },
        mainView,
        {
          // footer
          className: 'bt-Exp-Footer',
          ref: 'footer'
        }
      ]
    }
  },

  ready: function() {
    this.refs.main_view.setBackButton(this.refs.back_button);
  },

  setLocationHash: function(location_hash) {
    this.refs.footer.setContent(location_hash);
  },

  navigateHashPath: function(hash_path) {
    var bundle = new ExampleBundleNodeModel({});
    bundle.addChild('Root', this.getExampleBundle());

    var hashDirs = hash_path.substr(1).split('/');

    var refs = this.refs;

    util.each(hashDirs, function(hashDir) {
      if (hashDir.substr(-1) === '#') {
        if (!bundle.isLeaf()) {
          bundle = bundle.childByTitle(hashDir.substr(0, hashDir.length -1 ));
        }

        refs.main_view.showExampleView(bundle, { noTransition: true });
      } else {
        // if the child doesnt exist, we stop in the last found child
        if (bundle.childByTitle(hashDir)) {
          bundle = bundle.childByTitle(hashDir);
          refs.main_view.showChildBundle(bundle, { noTransition: true });
        }
      }    
    });    
  }
});

exports.LandingView = LandingView;
