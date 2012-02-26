var express = require('express');
var facebook = require('./facebook');

var app = module.exports = express.createServer();

// Configuration
if (process.env.DATABASE_URL) {
  var ActualDatabase = require('./actual_database').ActualDatabase;
  var db = new ActualDatabase(process.env.DATABASE_URL);
} else {
  var MockDatabase = require('./mock_database').MockDatabase;
  db = new MockDatabase();
}

app.configure(function(){
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(facebook(355193801181133,  '1b3699f8106b00403f9ddcb2fea60ebe'))
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

app.get('/all_numbers', function(req, res) {
  db.getNumbers(function(err, result) {
    if (err) {
      throw err;
    }
    res.send(JSON.stringify(result));
  });
});

app.post('/numbers', function(req, res) {
  if (!req.fb_session) {
    res.statusCode = 403;
    res.end();
    return;
  }
  var data = {
    uid: req.fb_session.user_id,
    number: req.body.number
  };
  db.addNumber(data, function(err, result) {
    if (err) {
      throw err;
    }
    res.send('null');
  });
});

var port = process.env.PORT || 0;
app.listen(port);
console.log("Express server at http://localhost:%d/ in %s mode",
  app.address().port, app.settings.env);
