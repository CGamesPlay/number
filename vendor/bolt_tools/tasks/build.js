var child_process = require('child_process');
var fs            = require('fs');
var less          = require('less');
var mkdirp        = require('mkdirp');
var modulr        = require('modulr');
var path          = require('path');
var util          = require('util');

var nop           = function() {};

var parsedOptions;

// -- globals --

var parsed = {};
var packageDependentModules   = {};
var packageDependentCss       = {};
// only keep track of image directories since we just care about files being
// added/removed from the directory
var packageDependentImageDirs = {};

var isBuildingPackage = {};
var isPackageDirty    = {};
var RECOMPILE_TIMEOUT = 1000; // in ms

var CSS_REGEX = /css$/,
    LESS_REGEX = /less$/,
    JS_REGEX = /js$/,
    IMAGE_REGEX = /(png|jpg|gif)$/,
    HTML_REGEX = /html$/,
    COPY_REGEX = /(json|txt|appcache)$/,
    NON_MODULE_REGEX = /(js|png|jpg|gif|css)$/,
    FILE_REGEX = /(css|less|js|png|jpg|gif|html|json|txt|appcache)$/
;

log = function(message) {
  !parsedOptions.quiet && console.log(message);
};

desc('build compressed js and css for bolt');
task('build', function(args, options, defer) {

  var optArray = [];
  for (var option in options) {
    // don't pass on the parallelize option since we don't want child
    // processes running in parallel-mode as well
    if (option === 'p') {
      continue;
    }

    var opt = options[option];
    // reconstruct the options passed in on the command line
    if (opt === true && option.length == 1) {
      optArray.push('-' + option);
    } else {
      optArray.push('--' + option + '=' + opt);
    }
  }

  var parallel = 1;
  // level of parallelization
  if (options.p && options.p > 0) {
    parallel = options.p;
  }

  if (!args || args.length === 0) {
    buildProject([], options, function() {
      defer.complete();
    });
  } else {
    var waitingForN = args.length;

    if (waitingForN > 0) {
      if (parallel > 1) {
        // how many worker processes to spawn
        var workers = Math.ceil(waitingForN / parallel);

        var groups = [];
        // chunk projects into different groups which will run in parallel
        while (args.length > 0) {
          groups.push(args.splice(0, workers));
        }
        var childrenToRun = groups.length;

        groups.forEach(function(args) {
          var options = ['build'];
          options = options.concat(args).concat(optArray);

          // spawn a worker process and listen for stdout, stderr, and exit code
          var proc = child_process.spawn('bolt', options);
          proc.stdout.on('data', function(data) {
            console.log(data.toString().trim());
          });

          proc.stderr.on('data', function(data) {
            console.log(data.toString().red.trim());
          });

          proc.on('exit', function(code) {
            // something went wrong -- bail out
            if (code !== 0) {
              throw Error('child process exited with code ' + code);
            } else {
              childrenToRun--;
              // wait for all child process to finish before 'completing'
              if (childrenToRun === 0) {
                defer.complete();
              }
            }
          });
        });
      } else {
        // run serially
        var bp = function() {
          if (args.length > 0) {
            var project = args.shift();
            buildProject([project], options, bp);
          } else {
            defer.complete();
          }
        };
        bp();
      }
    } else {
      defer.complete();
    }
  }
  return defer;
});

function buildProject(args, options, callback) {
  var configFile, packageConfig, configuration;

  parsed = options;
  parsed.watch = parsed.w || parsed.watch;
  parsed.minify = parsed.m || parsed.minify;
  parsed.environment = parsed.environment;
  parsed.verbose = parsed.v || parsed.verbose;
  parsed.quiet = parsed.q || parsed.quiet;
  parsed.targetPath = parsed.output;
  parsed.requirePaths = parsed.requirePaths;
  parsedOptions = parsed;

  // if --cache flag exists but no filename is specified, use default
  if (parsedOptions.cache === true) {
    parsedOptions.cache = '.bolt_cache.json';
  }

  if(parsed.help || parsed.h) {
    printMenu();
    return;
  }

  var basePath = '';
  //if no basePath provided use the relative one
  if (args[0]) {
    basePath = path.resolve(path.normalize(args[0]));
  } else {
    basePath = path.normalize(path.resolve('.'));
  }
  // read build config
  configFile = configFile || path.resolve(basePath, 'package.json');
  packageConfig = boltUtil.readConfiguration(configFile);
  configuration = packageConfig.bolt_build_manifest;
  configuration.package_name = configuration.package_name || packageConfig.name;

  if (!parsedOptions.quiet) {
    banner('building project ' + packageConfig.name);
  }

  if(!path.existsSync(configFile) || !fs.statSync(configFile).isFile()) {
    console.log( configFile + " does not exist, aborting...");
    printMenu();
    return;
  }

  if (configuration.constructor === Array) {
    var waitingForN = configuration.length;
    if (waitingForN > 0) {
      configuration.forEach(function(config) {
        processConfiguration(config, basePath, packageConfig, function() {
          waitingForN--;
          if (waitingForN === 0) {
            callback && callback();
          }
        });
      });
    } else {
      callback && callback();
    }
  } else {
    processConfiguration(configuration, basePath, packageConfig, callback);
  }
}

function printMenu() {
  console.log("bolt build [OPTION] [directory to package.json]");
  console.log("  -h this help menu");
  console.log("  -m minify");
  console.log("  --environment     dev or prod");
  console.log("  -w watch");
  console.log("  -q quiet");
  console.log("  -v verbose");
  console.log("  --o=OUTPUT_DIR    directory where output files should go");
  console.log("  --p=PARALLELISM   max number of builds to run in parallel");
  console.log("  --no-color        disable color output");
  console.log("  --cache[=FILE]    use cache to speed up builds");
}

var lastChange = {};
var detectChanges = function(packageTarget, files) {
  var changed = false;
  files = files || [];
  files.forEach(function(file) {
    var path = file.path || file;
    var stats = fs.statSync(path);

    if (!lastChange[packageTarget]) {
      lastChange[packageTarget] = {};
    }

    if (!lastChange[packageTarget][path] ||
         lastChange[packageTarget][path] < stats.mtime) {
      lastChange[packageTarget][path] = stats.mtime;
      changed = true;
    }
  });
  return changed;
};

var compileCSS = function(files, cssFile, callback) {
  files = files.sort();
  var contents = [];
  files.forEach(function(file) {
    var content = fs.readFileSync(file,'utf8');
    contents.push(content);
  });
  fs.writeFileSync(cssFile, contents.join(''));
  callback && callback();
};

var compileLess = function(files, cssFile, configuration, callback) {
  var basePath = configuration.basePath;
  var packageName = configuration.package_name;
  var foundEntryPoint = false;

  files.forEach(function(fileName) {
    // only process the main entry point (by convention <package_name>.less,
    // since we don't want to include files multiple times (e.g. via @imports)
    var fileName = path.normalize(fileName);
    var lessEntryPoint = path.join(basePath, 'less', packageName + '.less');
    if (fileName === lessEntryPoint) {
      log('compiling less \t' + path.basename(cssFile));

      var content = fs.readFileSync(fileName, 'utf8');
      var options = {
        paths: [path.join(basePath, 'less')]
      };
      foundEntryPoint = true;
      less.render(content, options,
        _processLessOutput.bind(null, cssFile, callback));
    }
  });
  if (!foundEntryPoint) {
    callback && callback();
  }
};

var _processLessOutput = function(cssFile, callback, error, cssContents) {
  if (error) {
    console.error('error parsing less file: ' + error);
  } else {
    fs.writeFile(cssFile, cssContents, function(err) {
      callback && callback();
    });
  }
};

var copyFilesCallbackGen = function(length, callback) {
  var count = 0;
  return function copyFilesFinished() {
    count++;
    if (count === length && callback) {
      return callback();
    }
  };
}

var copyFiles = function(files, packageTarget, callback) {
  var cmd;
  var aggregateCallback = copyFilesCallbackGen(files.length, callback);
  for (var i = 0; i < files.length; i++) {
    cmd = 'Copying ' + files[i] + ' to ' + packageTarget;
    parsedOptions.verbose && log(cmd);
    boltUtil.cp_r(files[i], packageTarget, aggregateCallback);
  }
};

var resolveCssDependencies = function(modulrResult, cssFile, callback) {
  var resolvedCss = '';

  var cssPaths = [];
  for (var id in modulrResult.dependencies) {
    var module = modulrResult.modules[id];
    var dirName = path.dirname(module.fullPath);

    var files = [
      path.join(dirName, module.id.split('/').pop() + '.css'),
      path.join(dirName, module.id.split('/').pop() + '.less')
    ];

    files.forEach(function(fileName) {
      if (path.existsSync(fileName)) {
        cssPaths.push(fileName);
      }
    });
  }

  if (cssPaths.length > 0) {
    log('compiling resolved css/less files \t' + path.basename(cssFile));

    var progress = 0;
    cssPaths.forEach(function(fileName) {
      var content = fs.readFileSync(fileName, 'utf8');

      less.render(content, { paths: [path.dirname(fileName)] },
        function(error, compiledCss) {
          resolvedCss += '/* ' + fileName + ' */\n';
          resolvedCss += compiledCss;

          progress++;
          // have we finished compiling all less files?
          if (progress === cssPaths.length) {
            fs.writeFile(cssFile, resolvedCss, function(err) {
              callback && callback(cssPaths);
            });
          }
        }
      );
    });
  }
};

var resolveImageDependencies = function(imageDirs) {
  var imagePaths = [];
  (imageDirs || []).forEach(function(dir) {
    imagePaths = imagePaths.concat(boltUtil.listFiles(dir, IMAGE_REGEX)
      .map(function(name) { return name.path; }));
  });

  return imagePaths;
};

var build = function(configuration, packageTarget, jsFile, cssFile, callback) {
  var basePath = configuration.basePath;
  var package_name = configuration.package_name;

  var modulePaths = packageDependentModules[packageTarget];
  var cssPaths = packageDependentCss[packageTarget];
  var imageDirs = packageDependentImageDirs[packageTarget];
  var imagePaths = resolveImageDependencies(imageDirs);

  var isFirstBuild = modulePaths === undefined;

  // rebuild, if:
  //  - we have not built the package yet
  //  - the list of dependent modules/css/images have changed since the last
  //    build
  if (isFirstBuild ||
      isPackageDirty[package_name] ||
      detectChanges(packageTarget, modulePaths) ||
      detectChanges(packageTarget, cssPaths) ||
      detectChanges(packageTarget, imagePaths)) {

    if (isBuildingPackage[package_name]) {
      if (!isFirstBuild) {
        // mark is as dirty so we know we still need to re-build eventually
        isPackageDirty[package_name] = true;
      }

      // abort if a build is already in progress
      return;
    } else {
      isBuildingPackage[package_name] = true;
      isPackageDirty[package_name] = false;
    }

    var configFunc = function(config) {
      // also search for modules in the index.js file of the directory named
      // after them.  default to true, if unspecified
      if (config.allowDirModules === undefined) {
        config.allowDirModules = true;
      }

      if (parsedOptions.requirePaths) {
        config.paths = config.paths.concat(
          parsedOptions.requirePaths.split(','));
      }

      if (config.environment === undefined) {
        config.environment = parsedOptions.environment || 'dev';
      }

      if (config.minify === undefined) {
        config.minify = parsedOptions.minify;
      }

      if (config.verbose === undefined) {
        config.verbose = parsedOptions.verbose;
      }

      if (config.cache === undefined && parsedOptions.cache) {
        var cache;
        try {
          var cacheString = fs.readFileSync(parsedOptions.cache, 'utf8');
          var cache = JSON.parse(cacheString);
        } catch(e) {
          cache = {};
        }
        configuration.cache = config.cache = cache;
      }
    };

    modulr.buildFromPackage(basePath, configFunc, function(err, result) {
      if (err) {
        isBuildingPackage[package_name] = false;
        console.error('\nFATAL'.red + ': modulr buildFromPackage failed with error:');
        console.error('error occurred while building: ' + basePath);
        console.error(err.toString());

        // exit the process if we are not in watcher mode since we want the
        // automated build to detect failures but otherwise want to recover
        // gracefully
        if (!parsedOptions.watch) {
          process.exit(1);
        } else {
          return;
        }
      }

      if (parsedOptions.cache) {
        mkdirp.sync(path.dirname(parsedOptions.cache), 0755);
        var cacheString = JSON.stringify(configuration.cache);
        fs.writeFileSync(parsedOptions.cache, cacheString);
      }

      var filePaths = [];
      var imageAssets = [];

      for (var id in result.dependencies) {
        var fullPath = result.modules[id].fullPath;

        if (path.basename(fullPath) === 'index.js') {
          // is module directory
          imageAssets.push(path.dirname(fullPath));
        }
        filePaths.push(fullPath);
      }
      packageDependentModules[packageTarget] = filePaths;
      packageDependentImageDirs[packageTarget] = imageAssets;

      // keep track of the state of each dependency
      var isDoneBuilding = {
        css: false, js: false, images: false
      };

      if (isFirstBuild) {
        // if it's the first build, then we need to get all image paths
        // from the modules' directories
        detectChanges(packageTarget, imageAssets);
        imagePaths = resolveImageDependencies(imageAssets);
      }

      if (imagePaths.length !== 0) {
        log('copying resolved images...');
        copyFiles(imagePaths, packageTarget, function() {
          isDoneBuilding.images = true;
          if (isDoneBuilding.js && isDoneBuilding.css) {
            callback && callback();
          }
        });
      } else {
        isDoneBuilding.images = true;
      }

      // a package must opt-in, for now
      if (configuration.require_css) {
        // now, check for css dependencies within each of the modules
        resolveCssDependencies(result, cssFile, function(filePaths) {
          packageDependentCss[packageTarget] = filePaths;
          if (typeof cssPaths === 'undefined') {
            detectChanges(packageTarget, filePaths);
          }

          isDoneBuilding.css = true;
          if (isDoneBuilding.js && isDoneBuilding.images) {
            callback && callback();
          }
        });
      } else {
        isDoneBuilding.css = true;
      }

      // if this is the first time we're building, we need to record the
      // modified times of the dependent files so on the next tick we
      // have something to compare to
      if (typeof modulePaths === 'undefined') {
        detectChanges(packageTarget, filePaths);
      }

      var code = result.output;

      fs.writeFile(jsFile, code, function(err) {
        isBuildingPackage[package_name] = false;
        if (err) {
          throw err;
        }

        console.log(('finished building ' + path.basename(jsFile) + ' with modulr').green);
        isDoneBuilding.js = true;
        if (isDoneBuilding.css && isDoneBuilding.images) {
          callback && callback();
        }
      });
    });
  }
};

var makeManifests = function(packageTarget, configuration, callback) {
  var manifestConfigs = configuration.package_manifests || [];
  if (configuration.package_manifest) {
    manifestConfigs.push(configuration.package_manifest);
  }
  if (manifestConfigs.length) {
    log("making manifest" + (manifestConfigs.length > 1 ? "s" : ""));
  }
  var files = boltUtil.listFiles(packageTarget).filter(function (file) {
    return file.fileName;
  });
  // get files before (synchronous) building so manifests do not appear
  // in each others' file lists
  manifestConfigs.forEach(function (manifestConfig) {
    if (boltManifest[manifestConfig.type]) {
      boltManifest[manifestConfig.type](packageTarget, files, manifestConfig);
    } else {
      log (' skipping unknown manifest type: ' + manifest.type);
    }
  });
  callback && callback();
}

var recompileIfChanged = function(sources, nonModuleSources, copies,
                                  configuration, packageConfig, callback) {
  var comparator = function(a, b) { return a.path.localeCompare(b.path); };
  var basePath = configuration.basePath;

  var files = [], moduleMap = {}, absToOrigPath = {};
  sources.forEach(function(src) {
    if (src.constructor === Array) {
      files = files.concat(
        boltUtil.listFiles(path.join(basePath,src[1]), FILE_REGEX)
        .sort(comparator)
      );
      moduleMap[path.resolve(path.join(basePath,src[1]))] = src[0];
      absToOrigPath[path.resolve(path.join(basePath, src[1]))] = src[1];
    } else {
      files = files.concat(
        boltUtil.listFiles(path.join(basePath,src), FILE_REGEX)
        .sort(comparator)
      );
    }
  });

  nonModuleSources.forEach(function(src) {
    boltUtil.files = files.concat(
      boltUtil.listFiles(path.join(basePath,src), NON_MODULE_REGEX)
      .sort(comparator)
    );
  });

  var copy = [];
  copies.forEach(function(src) {
    copy.push(path.join(basePath, src));
  });

  var js = [], css = [], less = [], images = [], html = [];
  files.forEach(function(file) {
    if (CSS_REGEX.test(file.path)) {
      css.push(file.path);
    } else if (LESS_REGEX.test(file.path)) {
      less.push(file.path);
    } else if (JS_REGEX.test(file.path)) {
      js.push(file);
    } else if (IMAGE_REGEX.test(file.path)) {
      images.push(file.path);
    } else if (HTML_REGEX.test(file.path)) {
      html.push(file.path);
    } else if (COPY_REGEX.test(file.path)) {
      copy.push(file.path);
    }
  });

  var packageTarget;
  if (parsedOptions.targetPath) {
    packageTarget = path.resolve(parsedOptions.targetPath,
      configuration.package_target);
  } else {
    packageTarget = path.resolve(basePath, configuration.package_target);
  }

  mkdirp(packageTarget, 0755, function(err) {
    var package_name = configuration.package_name;
    var jsFile = packageTarget + '/' + package_name + '.js';
    var cssFile = packageTarget + '/' + package_name + '.css';

    // We need to keep track of which steps have been completed so we
    // know when to fire the callback
    var pending = ['js', 'less', 'images', 'html', 'copying'];

    function finishedCompilingStep(step) {
      pending = pending.filter(function (pendingStep) {
        return pendingStep !== step;
      });
      if (pending.length == 0) {
        finishedCompiling(callback);
      }
    }

    function finishedCompiling(callback) {
      makeManifests(packageTarget, configuration, callback);
    }

    if (packageConfig.main) {
      // assume that if the package has a main property that it should be
      // built with modulr
      build(configuration, packageTarget, jsFile, cssFile, function() {
        finishedCompilingStep('js');
      });
    } else {
      finishedCompilingStep('js');
    }

    changed = detectChanges(packageTarget, less);
    if (changed) {
      log('compiling less...');
      compileLess(less, cssFile, configuration, function() {
        finishedCompilingStep('less');
      });
    } else {
      finishedCompilingStep('less');
    }

    changed = detectChanges(packageTarget, images);
    if (changed) {
      log('compiling images...');
      copyFiles(images, packageTarget, function() {
        finishedCompilingStep('images');
      });
    } else {
      finishedCompilingStep('images');
    }

    changed = detectChanges(packageTarget, html);
    if (changed) {
      log('compiling html...');
      copyFiles(html, packageTarget, function() {
        finishedCompilingStep('html');
      });
    } else {
      finishedCompilingStep('html');
    }
    changed = detectChanges(packageTarget, copy);
    if (changed) {
      log('copying files...');
      copyFiles(copy, packageTarget, function() {
        finishedCompilingStep('copying');
      });
    } else {
      finishedCompilingStep('copying');
    }

    if (parsedOptions.watch) {
      setTimeout(function() {
        recompileIfChanged(sources, nonModuleSources, copies, configuration,
          packageConfig, callback);
      }, RECOMPILE_TIMEOUT);
    }
  });
};

var processConfiguration = function(configuration, basePath, packageConfig, callback) {
  configuration.basePath = basePath;
  var sources = configuration.sources || [];
  var nonModuleSources = configuration.nonModuleSources || [];
  var copies = configuration.copies || [];
  var packages = configuration.packages || [];

  // Add in any packages
  for (var i = 0; i < packages.length; i++) {
    var otherPackagePath = packages[i];
    var otherPackageFile = path.resolve(basePath, otherPackagePath, "package.json");
    var otherPackageConfig = boltUtil.readConfiguration(otherPackageFile).bolt_build_manifest;
    var otherPackageSources = otherPackageConfig.sources;
    for (var j = 0; j < otherPackageSources.length; j++) {
      var otherPackageSource = otherPackageSources[j];
      if (otherPackageSource.constructor === Array) {
        otherPackageSource[1] = path.join(otherPackagePath, otherPackageSource[1]);
      } else {
        otherPackageSource = path.join(otherPackagePath, otherPackageSource);
      }
      sources.unshift(otherPackageSource);
    }
  }
  recompileIfChanged(sources, nonModuleSources, copies, configuration, packageConfig, callback);
};
