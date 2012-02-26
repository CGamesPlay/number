var path = require('path');
var fs   = require('fs');

// expects a config like:
// {
//   "type": "appcache",          // mandatory to reach this function
//   "name": "manifest.appcache", // name of manifest file
//   "html": "index.html",        // name of HTML file in which to ref the manifest
//   "cache_include": ".*",       // a pattern (or array) of files to include in CACHE
//   "cache_exclude": "",         // a pattern (or array) of files to exclude from CACHE
//   "network_include": "",       // a pattern (or array) of files to include in NETWORK
//   "network_exclude": ".*",     // a pattern (or array) of files to exclude from NETWORK
//   "network_wildcard": "*",     // additional NETWORK wildcard(s)
//   "fallback": {                // dictionary of FALLBACK routes
//     "/": "offline.html"
//   }
// }
exports.appcache = function (packageTarget, files, manifestConfig) {
  var config = boltUtil.defaultedConfig(manifestConfig, {
    "name": "manifest.appcache",
    "html": "index.html",
    "cache_include": ".*",
    "cache_exclude": "",
    "network_include": "",
    "network_exclude": "",
    "network_wildcard": "*",
    "network_wildcards": [],
    "fallback": {}
  });

  if (config.network_wildcard) {
    config.network_wildcards.push(config.network_wildcard);
    delete config.network_wildcard;
  }

  // open new file to write to
  var manifest = fs.createWriteStream(
    path.resolve(packageTarget, config.name)
  );

  // write header and timestamp comment that busts cache
  manifest.write('CACHE MANIFEST\n');
  manifest.write('# Built By bolt_tools\n');
  manifest.write('# ' + new Date().toUTCString() + '\n');

  // write cache entries
  manifest.write('\nCACHE:\n');
  boltUtil.matchingItems(files,
                         config.cache_include,
                         config.cache_exclude,
                         'fileName'
                         ).forEach(
    function (file) {
      if (file.fileName!=config.name) {
        manifest.write(file.fileName + '\n');
      }
    }
  );

  // write network entries and wildcards
  manifest.write('\nNETWORK:\n');
  boltUtil.matchingItems(files,
                         config.network_include,
                         config.network_exclude,
                         'fileName'
                         ).forEach(
    function (file) {
      if (file.fileName!=config.name) {
        manifest.write(file.fileName + '\n');
      }
    }
  );
  config.network_wildcards.forEach(function (wildcard) {
    manifest.write(wildcard + '\n');
  });

  // write fallback entries
  manifest.write('\nFALLBACK:\n');
  for (key in config.fallback) {
    manifest.write(key + ' ' + config.fallback[key] + '\n');
  };

  // insert manifest link into html document
  var htmlFile = path.resolve(packageTarget, config.html),
      html;
  if (!path.existsSync(htmlFile)) {
    log('Warning: HTML file not found: ' + htmlFile);
  } else {
    html = fs.readFileSync(htmlFile).toString();
    if (!/<html/.test(html)) {
      log('Warning: HTML element not found in ' + htmlFile);
    } else {
      if (/<html[^>]* manifest=[^>]*>/.test(html)) {
        log('Warning: HTML element already has manifest in ' + htmlFile);
      } else {
        html = html.replace('<html', '<html manifest="' + config.name + '"');
        fs.writeFileSync(htmlFile, html);
      }
    }
  }

  manifest.end();
};
