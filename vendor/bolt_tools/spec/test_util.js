var child_process = require('child_process');
var fs            = require('fs');
var path          = require('path');

var PATH_TO_BOLT = path.resolve(__dirname, '..', 'bolt');
var PATH_TO_TEST_SANDBOX = exports.PATH_TO_TEST_SANDBOX =
  path.resolve(__dirname, 'test_sandbox');

function createTestSandboxSync() {
  fs.mkdirSync(PATH_TO_TEST_SANDBOX, '755');
}

function destroyTestSandbox(cb) {
  // TODO(jlfwong): Make this work on Windows

  // Dangerous
  var cmd = 'rm -rf ' + PATH_TO_TEST_SANDBOX;
  child_process.exec(cmd, {}, function(err, stdout) {
    cb();
  });
}

var boltExec = exports.boltExec = function(cmd, cb) {
  child_process.exec('node ' + PATH_TO_BOLT + ' ' + cmd, {}, cb);
};

exports.tearDownTestSandbox = function() {
  process.chdir(__dirname);

  var waiting = true;

  destroyTestSandbox(function() {
    waiting = false;
  });

  waitsFor(function() { return !waiting; });
};

// Creates the sandbox directory, runs `bolt new foo`, and changes the cwd
// to be inside the new bolt project
exports.setUpNewProject = function() {
  this.addMatchers({
    toBeADirectory: function() {
      return path.existsSync(this.actual) &&
        fs.statSync(this.actual).isDirectory();
    },
    toBeAFile: function() {
      return path.existsSync(this.actual) &&
        fs.statSync(this.actual).isFile();
    }
  });

  var waiting = true;

  // In case the last test run choked, make sure we start with an empty
  // sandbox
  destroyTestSandbox(function() {
    waiting = false;
  });

  waitsFor(function() { return !waiting; });

  runs(function() {
    createTestSandboxSync();
    process.chdir(PATH_TO_TEST_SANDBOX);

    waiting = true;

    boltExec('new foo', function(err, stdout, stderr) {
      expect(err).toBe(null);
      if (stderr) {
        console.error(stderr);
      }
      expect('./foo').toBeADirectory();
      process.chdir(path.join(PATH_TO_TEST_SANDBOX, 'foo'));
      waiting = false;
    });
  });

  waitsFor(function() { return !waiting; });
};
