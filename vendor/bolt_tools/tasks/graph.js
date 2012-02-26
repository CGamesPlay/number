// make pretty graphs using DOT
//
// the simplest DOT format looks like:
//
// digraph "graph name" {
//   "node 1" -> "node 2"
//   "node 1" -> "node 3"
//   "node 2" -> "node 3"
//   ...
// }
//
// see http://graphviz.org/pdf/dotguide.pdf for more docs

var path = require('path');
var modulr = require('modulr');
var spawn = require('child_process').spawn;
var fs = require('fs');

desc('print a module dependency graph using DOT. First install Graphviz ' +
  'from http://www.graphviz.org .  Creates graph.pdf in the working directory and ' +
  'opens it. To just print the graph text, use the --nopdf option.' +
  'To specify a root module, use --root=lib/module_name.  ' +
  'To omit lazily evaluated modules, use the --nolazy option.');

task('graph', function(args, options) {
  var basePath;

  var requirePaths = (options.extraPaths || '').split(',');

  //if no basePath provided use the relative one
  if (args[1]) {
    basePath = path.resolve(path.normalize(args[1]));
  } else {
    basePath = path.normalize(path.resolve('.'));
  }

  var configFile = path.resolve(basePath, 'package.json');
  var packageConfig = boltUtil.readConfiguration(configFile);

  var configFunc = function(config) {
    // setup default paths to bolt
    config.allowDirModules = true;

    for (var i = 0; i < requirePaths.length; i++) {
      config.paths.push(requirePaths[i]);
    }
  };

  var tempConfigFile;
  if (options.root) {
    // If a different root module has been specified than the one
    // in package.json, create a temporary package file with the
    // root module set as it's 'main' module.
    tempConfigFile = path.resolve(basePath, 'packageGraphTemp.json');
    packageConfig.main = options.root;

    fs.writeFileSync(tempConfigFile, JSON.stringify(packageConfig));
  }

  modulr.buildFromPackage(tempConfigFile || basePath, configFunc, function(err, result) {

    if (err) {
      console.log('Error generating graph: ' + err);
      return;
    }
    var lazyModules = result.lazyEval || {};
    var noLazyModules = options.nolazy;

    var normalStyledModules = {};

    var digraph = 'digraph app {';

    for (var id in result.dependencies) {
      if (noLazyModules && id in lazyModules) {
        // Skip processing the edges going out of a lazy module
        continue;
      }

      var module = result.modules[id];

      var deps = module.getDirectDependencies();
      for (var d_id in deps) {

        digraph += '  "' + module.id + '" -> "' + deps[d_id] + '"';

        if (d_id in lazyModules) {
          // Make all edges going to a lazy evaluated module dotted.
          digraph += ' [style=dotted]';
        }
        digraph += ';\n';
      }

      if (!(id in lazyModules) && !normalStyledModules[id]) {
        normalStyledModules[id] = true;
      }
    }

    // Make all non-lazy modules grey
    for (var id in normalStyledModules) {
      digraph += '  "' + id + '" [style=filled,color=grey];\n';
    }

    digraph += '}';

    if (!options.nopdf) {
      try {
        var pdf = spawn('dot', ['-Tpdf', '-o', 'graph.pdf']);

        pdf.stdin.write(digraph);

        pdf.on('exit', function(code) {
          var open = spawn('open', ['graph.pdf']);
        });

        pdf.stdin.end();
      } catch (e) {
        console.log('Creation of a PDF failed.' +
          ' Please ensure you have the "dot" program installed');
      }
    } else {
      console.log(digraph);
    }

    if (tempConfigFile) {
      // Clean up the temp package file we created.
      fs.unlinkSync(tempConfigFile);
    }

  });
});
