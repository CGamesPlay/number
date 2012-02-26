var fs = require('fs');
var path = require('path');

var test_util = require('./test_util');

describe('bolt version', function() {
  it('displays the current version of bolt_tools', function() {
    var version = JSON.parse(fs.readFileSync(
      path.resolve( __dirname, '..', 'package.json'))).version;

    test_util.boltExec('version', function(err, stdout, stderr) {
      expect(err).toBe(null);
      expect(stdout.indexOf(version)).not.toEqual(-1);
    });
  });
});
