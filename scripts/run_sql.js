var pg = require('pg');

pg.connect(process.env.DATABASE_URL, function(err, db) {
  var query = process.argv.slice(2).join(' ');
  console.log("Query: " + query);
  db.query(query, function(err, result) {
    if (err) {
      console.error(err.toString());
      process.exit(1);
    }
    console.log(result);
    process.exit(0);
  });
});
