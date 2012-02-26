var path   = require('path');
var rimraf = require('rimraf');

desc('clean a projects target');
task('clean', function(args, options, defer) {
  if (!args || args.length === 0) {
    cleanProject([], options, function() {
      defer.complete();
    });
  } else {
    var waitingForN = args.length;

    args.forEach(function(arg) {
      cleanProject([arg], options, function() {
        waitingForN--;
        if (waitingForN === 0) {
          defer.complete();
        }
      });
    });
  }

  return defer;
});

function isSafe(path) {
  var safe = path !== '/' && path !== process.env.HOME;
  if (safe) {
    return true;
  } else {
    console.log('refusing to clean ' + path);
    return false;
  }
}

function cleanProject(args, options, callback) {
  var configFile, packageConfig, configuration, packageTarget;
  var basePath = '';
  //if no basePath provided use the relative one
  if (args[0]) {
    basePath = path.resolve(path.normalize(args[0]));
  } else {
    basePath = path.normalize(path.resolve('.'));
  }
  configFile = configFile || path.resolve(basePath, 'package.json');
  packageConfig = boltUtil.readConfiguration(configFile);
  banner('cleaning project ' + packageConfig.name);
  configuration = packageConfig.bolt_build_manifest;
  configuration.package_name = configuration.package_name || packageConfig.name;
  packageTarget = configuration.package_target;
  var outputPath = path.resolve(options.output);
  var absoluteTarget = path.join(outputPath, packageTarget);
  if (packageTarget && absoluteTarget !== basePath && isSafe(absoluteTarget)) {
    var cmd = 'Deleting ' + absoluteTarget;
    console.log(cmd);
    rimraf(absoluteTarget, function(err, stdout, stderr) {
      if (stderr) {
        console.log(stderr);
      }
      callback && callback();
    });
  } else {
    banner('whoa there buddy you are about to nuke your project!');
    console.log('modify your package.json so the package_target is not the same as your source dir');
  }
}
