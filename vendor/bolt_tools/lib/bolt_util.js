var colors = require('colors');
var fs     = require('fs');
var ncp    = require('ncp').ncp;
var path   = require('path');
var rimraf = require('rimraf');

exports.readConfiguration = function(configFile) {
  var content = fs.readFileSync(configFile, 'utf8');
  var json = JSON.parse(content);
  return json;
};

var stringTransform = function(str, separator) {
  var out = [];
  for (var i = 0; i < str.length; i++) {
    var chr = str.charAt(i);
    if (chr.match(/[A-Z]/) && i > 0) {
      out.push(separator, chr.toLowerCase());
    } else if (chr.match(/[_.\s]/)) {
      out.push(separator);
    } else {
      out.push(chr.toLowerCase());
    }
  }
  return out.join('');
};

exports.underscore = function(str) {
  return stringTransform(str, '_');
};

// to match against arrays or regex;
// best used with something like Array.filter
exports.matchFunction = function (criterion) {
  if (criterion.constructor === Function) {
    return criterion;
  } else if (criterion.constructor === Array) {
    return function (candidate) {return criterion.indexOf(candidate)!==-1;};
  } else if (criterion.constructor === RegExp) {
    return function (candidate) {return criterion.test(candidate);};
  } else if (criterion) {
    var regex = new RegExp(criterion);
    return function (candidate) {return regex.test(candidate);};
  }
  return function (candidate) {return false;};
};

// given an array, include and exlude items based on value (or property's value)
exports.matchingItems = function (items, include, exclude, matchProperty) {
  var includeTest = exports.matchFunction(include),
      excludeTest = exports.matchFunction(exclude);
  if (matchProperty) {
    return items.filter(function (item) {
      return includeTest(item[matchProperty]) &&
             !excludeTest(item[matchProperty]);
    });
  } else {
    return items.filter(function (item) {
      return includeTest(item) &&
             !excludeTest(item);
    });
  }
};

// flat list of files from a directory & its subdirectories
exports.listFiles = function listFiles(rootPath, include) {
  var files = [];

  var stats;
  try {
    stats = fs.lstatSync(rootPath);
  } catch (e) {
    console.error(e.stack);
    return files;
  }

  var fileName = path.basename(rootPath);
  var ignoreHidden = (fileName.indexOf('.') === 0 && fileName.length > 1);
  if (!include) {
    include = /.+/;
  }
  var match = exports.matchFunction(include);

  if (stats.isDirectory() && !ignoreHidden) {
    if (match(rootPath)) {
      // replace backslashes with forward slashes to avoid WTFery with Windows
      files.push({path: rootPath.replace(/\\/g, '/'), fileName: null});
    }

    var subpaths = fs.readdirSync(rootPath);
    subpaths.forEach(function(subpath) {
      files = files.concat(listFiles(path.join(rootPath, subpath), match));
    });
  } else {
    // Do not include hidden files, which start with a '.'
    if (match(fileName) && fileName.indexOf('.') !== 0) {
      // replace backslashes with forward slashes to avoid WTFery with Windows
      files.push({path: rootPath.replace(/\\/g, '/'), fileName: fileName});
    }
  }
  return files;
};

// Queue up copy requests so we don't open too many files at once.
// We need to coordinate with ncp which also takeas a limit argument.
var ncpQueue = []; // queue of requests
var running = 0;
var limit = 64;
var dirNcpLimit = 16; // ncp's internal limit when copying directories

var ncpCallback = function(ncpLimit, callback) {
  running -= ncpLimit;
  tryNcp();
  callback();
};

var runNcp = function(source, destination, options, callback) {
  ncpQueue.push({
    source: source,
    destination: destination,
    options: options,
    callback: callback
  });
  tryNcp();
};

var tryNcp = function() {
  // unlike ncp, options is required and must have a limit property
  if (ncpQueue.length === 0) {
    return;
  }

  var args = ncpQueue[0];
  var ncpLimit = args.options.limit;
  if (running + ncpLimit > limit) {
    return;
  }

  running += ncpLimit;
  ncpQueue.shift();
  var cb = ncpCallback.bind(null, ncpLimit, args.callback);
  ncp(args.source, args.destination, args.options, cb);
};

// Wrapper around ncp to add functionality without modifying the module directly
exports.cp_r = function cp_r(source, destination, options, callback) {
  // allow ncp to copy files directly to a directory
  var ncpLimit = 1;
  path.exists(destination, function (exists) {
    if (exists) {
      if (fs.statSync(destination).isDirectory()) {
        destination = path.join(destination, path.basename(source));
        ncpLimit = dirNcpLimit; // directories can copy more files at once
      }
    }

    if (!callback) {
      callback = options;
      options = {};
    }
    options.limit = ncpLimit;
    runNcp(source, destination, options, callback);
  });
};

exports.rm_r = function rm_r(target, callback) {
  rimraf(target, callback);
};

// default config options by merging unprototyped objects
exports.defaultedConfig = function (config, defaults) {
  // supports flat config
  var defaulted = {};
  for (key in defaults) {
    defaulted[key] = defaults[key];
  }
  for (key in config) {
    defaulted[key] = config[key];
  }
  return defaulted;
};

exports.modulr = require('modulr');
