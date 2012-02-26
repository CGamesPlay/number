var child_process = require('child_process');
var fs            = require('fs');
var os            = require('os');
var path          = require('path');
var util          = require('util');

function getTestFolderPaths(rootPath) {
  rootPath = rootPath || process.cwd();
  return boltUtil.listFiles(rootPath, /__tests__$/).map(function(f) {
    return f.path;
  });
}

// Define a task to generate test files
desc('builds all __tests__ packages and opens them in the browser');
task('test', function(args, options, defer) {
  var rootPath = args && args[0];
  var testFolders = getTestFolderPaths(rootPath);

  exec('build', testFolders, options, function() {
    testFolders.forEach(function(testFolderPath) {
      var packagePath = path.join(testFolderPath, 'package.json');
      var packageContents = boltUtil.readConfiguration(packagePath);

      var manifest = packageContents.bolt_build_manifest;

      var targetPath = path.resolve(testFolderPath, manifest.package_target);

      // Assume that the first html file listed in the sources is the
      // test runner
      var runnerBasename = manifest.sources.filter(function(source) {
        return (/\.html$/).test(source);
      })[0];

      var runnerPath = path.join(targetPath, runnerBasename);

      if (options['build-only']) {
        defer.complete();
      } else {
        var command;
        if (os.type().toLowerCase().indexOf('windows') !== -1) {
          // Windows
          command = 'start chrome ' + runnerPath;
        } else {
          // Mac + everything else
          command = 'open -a "Google Chrome" ' + runnerPath;
        }
        child_process.exec(command).on('exit', function(error) {
          if (error) {
            console.log("Couldn't open Chrome. To start the test run, open " +
              runnerPath + " in your browser");
          }
          defer.complete();
        });
      } 
    });
  });
  return defer;
});


desc('deprecated - use bolt test');
task('gentest', [], function() {
  console.error('Bolt gentest is deprecated. Use bolt test instead.'.yellow);
});

desc('deprecated - use bolt test');
task('runtest', function(args, options) {
  console.error('Bolt runtest is deprecated. Use bolt test instead.'.yellow);
});
