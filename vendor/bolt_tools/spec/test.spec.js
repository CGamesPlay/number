var child_process = require('child_process');
var fs            = require('fs');
var path          = require('path');

var test_util = require('./test_util');

describe('bolt test', function() {
  beforeEach(test_util.setUpNewProject);

  it('builds the test package', function() {
    var waiting;

    runs(function() {
      waiting = true;
      test_util.boltExec('test --build-only', function(err, stdout, stderr) {
        expect(err).toBe(null);
        expect(path.join('build', 'foo_tests.js')).toBeAFile();
        expect(path.join('build', 'test.html')).toBeAFile();
        expect(path.join('build', 'jasmine')).toBeADirectory();
        waiting = false;
      });
    });

    waitsFor(function() { return !waiting; });

    runs(function() {
      waiting = true;
      test_util.boltExec('clean', function(err, stdout, stderr) {
        expect(err).toBe(null);
        expect(path.join('build', 'foo_tests.js')).not.toBeAFile();
        expect(path.join('build', 'test.html')).not.toBeAFile();
        expect(path.join('build', 'jasmine')).not.toBeADirectory();
        waiting = false;
      });
    });

    waitsFor(function() { return !waiting; });

  });

  afterEach(test_util.tearDownTestSandbox);
});
