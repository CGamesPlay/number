var path  = require('path');
var fs    = require('fs');
var cli   = require('cli');

var child_process = require('child_process');

var SKELETON_DIR = path.resolve(__dirname, '..', 'skeleton');

function printHelp() {
  console.log('usage: bolt new [PROJECT NAME] --directory [dirname] --target [target]');
  console.log('This command generates a new empty bolt project.');
}

desc('generates a new empty bolt project');
task('new', function(args, options) {
  if (!args[0]) {
    cli.error('usage: bolt new [name]');
    console.log('you must provide a name for your project');
    return;
  }
  var PROJECT_NAME = boltUtil.underscore(args[0]);
  var PROJECT_DIR = path.join(options.directory || '', PROJECT_NAME);

  if (options.h || options.help) {
    printHelp();
    return;
  }

  banner('generating a new bolt project ' + PROJECT_NAME + ' in ' + PROJECT_DIR);

  // fail if the directory already exists
  if (path.existsSync(PROJECT_DIR)) {
    cli.error(PROJECT_DIR + ' already exists. Choose another name or location for your project.');
    return;
  }

  var skeletonMapping = boltUtil.listFiles(SKELETON_DIR, /.+/).map(function(skelFile) {
    return {
      srcPath: skelFile.path,
      dstPath: path.join(PROJECT_DIR,
        skelFile.path.substring(SKELETON_DIR.length + 1))
    };
  });

  // Sorting the files ascending by length ensures that directories are
  // created before their contents. This removes the need to check if the
  // directories things are being placed in have been created already.
  skeletonMapping.sort(function(a, b) {
    return a.dstPath.length - b.dstPath.length;
  });

  // For each of the files in the skeleton directory, we want to copy them
  // to the corresponding location in the newly generated project.
  //
  // Before the files are copied, both the filename and the contents of the
  // actual file are templated.
  //
  // This uses a really basic template system where __TEMPLATE_VAR__ is replaced
  // by the variable with the key TEMPLATE_VAR in the object literal below.
  //
  // See the skeleton/package.json for an example of what this is used for
  var templateVars = {
    PROJECT_NAME   : PROJECT_NAME,
    PROJECT_TARGET : options.target || 'build'
  };

  function template(input) {
    return input.replace(new RegExp('__([_A-Z]+)__', 'g'), function(match) {
      if (templateVars.hasOwnProperty(match)) {
        return templateVars[match];
      } else {
        return match;
      }
    });
  }

  skeletonMapping.forEach(function(mapping) {
    var srcPath = mapping.srcPath;
    var dstPath = mapping.dstPath;

    var stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      fs.mkdirSync(dstPath, '755');
    } else {
      var contents = fs.readFileSync(srcPath, 'utf8');
      for (var varName in templateVars) {
        if (!templateVars.hasOwnProperty(varName)) {
          continue;
        }
        var re = new RegExp('__' + varName + '__', 'g');

        contents = contents.replace(re, templateVars[varName]);
        dstPath  =  dstPath.replace(re, templateVars[varName]);
      }

      fs.writeFileSync(dstPath, contents);
    }
  });
});
