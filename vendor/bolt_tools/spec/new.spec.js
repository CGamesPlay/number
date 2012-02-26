var child_process = require('child_process');
var fs            = require('fs');
var path          = require('path');

var test_util = require('./test_util');

describe('bolt new', function() {
  beforeEach(test_util.setUpNewProject);

  it('sets up the directory structure', function() {
    expect('__tests__').toBeADirectory();
    expect('less').toBeADirectory();
    expect('lib').toBeADirectory();
    expect('vendor').toBeADirectory();
    expect('vendor', 'jasmine').toBeADirectory();
  });

  it('copies Boltfile', function() {
    expect('Boltfile').toBeAFile();

    var waiting = true;

    // The count_lines task is in the example Boltfile, so let's check
    // if it's being loaded correctly
    test_util.boltExec('count_lines', function(err, stdout, stderr) {
      // This will fail on Windows because count_lines uses *nix commands
      expect(err).toBe(null);
      expect(stdout).toMatch(new RegExp("project linecount:"));
      waiting = false;
    });

    waitsFor(function() { return !waiting; });
  });

  it('templates the package.json', function() {
    expect('package.json').toBeAFile();

    var packageContents = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    expect(packageContents.name).toEqual('foo');
    expect(packageContents.bolt_build_manifest.package_name).toEqual('foo');
    expect(packageContents.bolt_build_manifest.package_target).toEqual('build');
  });

  afterEach(test_util.tearDownTestSandbox);
});

