var child_process = require('child_process');
var fs            = require('fs');
var path          = require('path');

var test_util = require('./test_util');

describe('bolt build', function() {
  beforeEach(test_util.setUpNewProject);

  it('builds the js, css and copies the html. Clean deletes it.', function() {
    var waiting;

    runs(function() {
      waiting = true;
      test_util.boltExec('build', function(err, stdout, stderr) {
        expect(err).toBe(null);
        expect(path.join('build', 'foo.js')).toBeAFile();
        expect(path.join('build', 'foo.css')).toBeAFile();
        expect(path.join('build', 'index.html')).toBeAFile();
        waiting = false;
      });
    });

    waitsFor(function() { return !waiting; });

    runs(function() {
      waiting = true;
      test_util.boltExec('clean', function(err, stdout, stderr) {
        expect(err).toBe(null);
        expect(path.join('build', 'foo.js')).not.toBeAFile();
        expect(path.join('build', 'foo.css')).not.toBeAFile();
        expect(path.join('build', 'index.html')).not.toBeAFile();
        waiting = false;
      });
    });

    waitsFor(function() { return !waiting; });

  });

  afterEach(test_util.tearDownTestSandbox);
});

