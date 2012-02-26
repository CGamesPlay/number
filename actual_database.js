var pg = require('pg');

function ActualDatabase(url) {
  this.db = new pg.Client(url);
  this.db.connect();
}

ActualDatabase.prototype.getNumbers = function(callback) {
  this.db.query('SELECT * FROM numbers', function(err, result) {
    if (err) {
      callback(err);
    } else {
      callback(false, result.rows);
    }
  });
};

ActualDatabase.prototype.addNumber = function(data, callback) {
  this.db.query('UPDATE numbers SET number = number + $1 WHERE uid = $2',
    [ data.number, data.uid ], callback);
}

exports.ActualDatabase = ActualDatabase;
