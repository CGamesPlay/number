var pg = require('pg');

var users = [
  { uid: 693594821, name: "Ryan Patterson" },
  { uid: 1112871867, name: "Mike Dodge" }
];

pg.connect(process.env.DATABASE_URL, function(err, db) {
  db.query('DROP TABLE numbers');
  db.query('CREATE TABLE numbers ( id serial, uid integer, name varchar(64), number integer )');
  users.forEach(function(u) {
    db.query('INSERT INTO numbers ( uid, name, number ) VALUES ( $1, $2, 0 )',
      [ u.uid, u.name ]);
  });

  db.on('drain', function() {
    console.log('Done!');
    process.exit(0);
  });
});
