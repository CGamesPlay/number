var AppController = require('./controllers/app_controller').AppController;

function init(modules) {
  new AppController({modules: modules});

}

exports.init = init;
