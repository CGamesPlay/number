var Backbone = require('backbone');
var Mustache = require('mustache');
var MyNumber = require('./my_number').MyNumber;
var MyNumberCollection = require('./my_number').MyNumberCollection;

var MyNumberView = Backbone.View.extend({
  itemTemplate:
    '<li><img src="//graph.facebook.com/{{uid}}/picture?type=normal" />' +
    '<h3>{{name}}</h3>' +
    '<p>Current number: {{number}}</p></li>',

  initialize: function() {
    this.model.bind('add', this.addOne, this);
    this.model.bind('reset', this.addAll, this);
    this.model.bind('all', this.render, this);

    this.addAll(this.model);
  },

  addOne: function(item) {
    this.$('ul').append(Mustache.to_html(this.itemTemplate, item.toJSON()));
  },

  addAll: function(items) {
    this.$('ul').empty();
    items.each(this.addOne, this);
  },

  render: function() {
    this.$('li')[0].dataset.theme = 'e';
    this.$('ul').listview('refresh');
    return this;
  }
});

var ChangeNumberView = Backbone.View.extend({
  el: '#change-numbers',

  defaultValue: 20,
  maximumValue: 100,

  events: {
    "change input": "changeNumber",
    "click button:jqmData(action='submit')": "submit",
    "click button:jqmData(action='more')": "addOne",
    "click button:jqmData(action='less')": "removeOne",
  },

  initialize: function() {
    this.input = this.$('input')[0];

    this.model = new MyNumber();
    this.model.bind('change', this.render, this);
    this.model.set('number', this.defaultValue);
  },

  render: function() {
    this.input.value = this.model.get('number');
    this.input.max = this.maximumValue;
    $(this.input).slider('refresh');
    return this;
  },

  changeNumber: function(evt) {
    this.model.set('number', parseInt(this.$('input')[0].value, 10));
  },

  submit: function() {
    $.mobile.showPageLoadingMsg();
    this.$(':jqmData(action="submit")').attr('disabled', 'disabled');
    var me = this;
    this.model.save(null, {
      error: function(err) {
        me.$(':jqmData(action="submit")').removeAttr('disabled');
        $.mobile.hidePageLoadingMsg();
        alert('Something went wrong.');
      },
      success: function() {
        me.model.set('number', 0);
        me.$(':jqmData(action="submit")').removeAttr('disabled');
        $.mobile.hidePageLoadingMsg();
        me.trigger('change');
      }
    });
  },

  addOne: function() {
    this.model.set('number', 1 + this.model.get('number'));
  },

  removeOne: function() {
    this.model.set('number', -1 + this.model.get('number'));
  }
});

var LoginDialog = Backbone.View.extend({
  template:
    '<div data-role="header"><h1>Log in</h1></div>' +
    '<div data-role="content"><p>Only Mike and Ryan can use this app, but ' +
    'you can click log in anyways.</p><button data-theme="b">Log in with Facebook</button>' +
    '</div>',

  events: {
    'click button': 'performLogin'
  },

  initialize: function() {
    this.render();
    this.$el.appendTo(document.body).trigger('create');
  },

  render: function() {
    this.el.dataset.role = "dialog";
    this.$el.html(Mustache.to_html(this.template));
  },

  performLogin: function() {
    var me = this;
    FB.login(function(response) {
      if (response.authResponse) {
        me.$el.dialog('close');
      }
    });
  }
});

exports.App = Backbone.View.extend({
  el: '#home-page',

  initialize: function() {
    this.otherNumbers = new MyNumberCollection();

    this.list = new MyNumberView({
      model: this.otherNumbers,
      el: this.$('#current-numbers')
    });

    this.form = new ChangeNumberView();

    this.form.on('change', function() {
    });
    this.form.on('change', this.otherNumbers.fetch, this.otherNumbers);

    this.otherNumbers.fetch();

    if (window.FB) {
      this.checkFacebook();
    } else {
      window.fbAsyncInit = this.checkFacebook.bind(this);
    }
  },

  checkFacebook: function() {
    FB.init({
      appId: 355193801181133,
      channelUrl: '//radiant-stone-4589.herokuapp.com/channel.html',
      cookie: true
    });

    var me = this;
    FB.getLoginStatus(function(response) {
      if (response.status !== 'connected') {
        me.loginWithFacebook();
      }
    });
  },

  loginWithFacebook: function() {
    var view = new LoginDialog();
    $.mobile.changePage(view.$el, { transition: 'flip' });
  }
});
