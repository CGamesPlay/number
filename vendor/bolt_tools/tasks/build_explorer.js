var fs     = require('fs');
var less   = require('less');
var path   = require('path');
var rimraf = require('rimraf');
var _      = require('underscore');

var cache_path = path.resolve('.bolt_explorer_cache');

desc('scan through bolt to find views and build the explorer');
task('build_explorer', function(args, options, defer) {

  options = load_cached_options(options);

  var examples_dir   = options.examplesPath || '.';
  var explorer_pkg   = options.explorerPkg || 'explorer_pkg';
  var assets_dir     = options.assetsDir;

  var post_stdin_callback = function() {
    compile_less(examples_dir, explorer_pkg, function() {
      generateModulrMain(examples_dir, explorer_pkg, function() {
        var requirePaths = options.extraPaths.split(',');
        requirePaths.push(examples_dir);

        options.requirePaths = requirePaths.map(path.resolve).join(',');
        
        args = [explorer_pkg];

        // always write current options to cache
        fs.writeFileSync(cache_path, JSON.stringify(options), 'utf8');

        exec('build', args, options, function() {
          // copies assets directory, if it exists
          if (assets_dir) {
            assets_dir = path.resolve(assets_dir);
            var assets = boltUtil.listFiles(assets_dir);
            
            assets_dir = assets_dir.replace(/\\/g, '/');
            for (var i = 0; i < assets.length; i++) {
              if (assets_dir === assets[i].path) {
                continue;
              }
              boltUtil.cp_r(assets[i].path, path.resolve(explorer_pkg + '/app'), function() {
                defer.complete();
              });
            }
          }
        });
      });
    });
  };

  copy_to_explorer(explorer_pkg, function() {
    if (options.extraPaths === undefined) {
      // prompt the user for the extra paths, if not specified
      var stdin = process.stdin, stdout = process.stdout;
      stdin.resume();
      stdout.write('Please specify paths to look for bolt and bolt_touch, e.g.\n' +
                   '$ bolt build_explorer --extraPaths=../ , for bolt and bolt_touch\n' +
                   'located in, e.g., ../bolt or ../bolt_touch\n>');
      stdin.once('data', function(data) {
        options.extraPaths = data.toString().trim();
        stdin.destroy();
        post_stdin_callback();
      });
    } else {
      post_stdin_callback();
    }
  });
});

function load_cached_options(options) {
  // loads cached version of options
  if (_.isEmpty(options) && path.existsSync(cache_path)) {
    banner(("Using cached options for build; to clear options, delete the file " + cache_path).green);

    // no options; read from cache
    options = boltUtil.readConfiguration(cache_path);
  }

  return options;
}

function copy_to_explorer(explorer_pkg, callback) {
  var explorer_path = path.resolve(__dirname + '/../explorer/');
  var local_explorer_path = path.resolve(explorer_pkg);

  rimraf(local_explorer_path, function() {
    boltUtil.cp_r(explorer_path, local_explorer_path, callback);
  });
}

// finds example.less files and builds examples.less from those
function compile_less(examples_dir, explorer_pkg, callback) {
  console.log('Compiling example less files');

  var importFile = '';
  boltUtil.listFiles(examples_dir, /example.less$/).forEach(function(file) {
    var full_path = path.resolve(examples_dir + '/' + file.path);
    
    importFile += '/* ' + full_path + ' */\n';
    importFile += '@import "' + full_path +'";\n\n';
  });
  
  var output_file = path.resolve(explorer_pkg + '/lib/views/landing_view/examples.less');
  
  less.render(
    importFile, { paths: ['/'] },
    function(cssFile, error, cssContents) {
      if (error) {
        console.error('error parsing less file: ' + error);
      } else {
        fs.writeFile(cssFile, cssContents, function(err) {
          if (err) {
            console.error('error writing less file: ' + err);
          }
        });
      }
    }.bind(null, output_file));
  
  callback && callback();
}

// finds example.js files and builds modulr_main.js from those
function generateModulrMain(examples_dir, explorer_pkg, callback) {
  banner('generating modulr_main.js');
  var modules = boltUtil.listFiles(examples_dir, /example.js$/).map(function(file) {
    // strip path down to the module name
    file = file.path;
    
    file = file.replace(examples_dir + '/', ''); // get rid of relative path
    file = file.replace('.js', '');              // get rid of .js
    
    return file;
  });
  
  // found no examples, let's bail
  if (modules.length === 0) {
    console.log('found no examples in ' + examples_dir + ' - goodbye.');
    process.exit(0);
  }

  // generates modulr file
  var modulr_file = [
    '//',
    '// ** This file is auto-generated by build_examples **',
    '//',
    '',
    modules.map(function(module) {
      return "require('" + module + "');";
    }).join('\n'),
    '',
    'var exampleModules = [',
    modules.map(function(module) {
      return "  '" + module + "'";
    }).join(',\n'),
    '];',
    '',
    "require('init').init(exampleModules);"
  ].join("\n") + "\n";
  fs.writeFileSync(path.resolve(explorer_pkg) + '/lib/modulr_main.js', modulr_file);

  console.log('found ' + modules.length + ' examples');

  callback && callback();
}
