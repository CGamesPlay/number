var App = require('./app').App;

$(document).bind("pageinit", function(event) {
  window.app = new App();
});
