UI Component explorer for bolt
==============================

explorer is a dynamically generated HTML5 page that showcases bolt UI components.

Usage
-----

To use, navigate to any directory that contains UI examples (say,
bolt_touch). Then run

  $ bolt build_explorer

This task scrapes the current directory for examples (so they don't
have to be in the root of the current dir). It then creates a mock app
in [current_dir]/explorer_pkg/app/, which will contain all examples
declared in [current_dir] or any subdirectory. To visualize these
examples, simply open a browser and point it to

  file:///[current_dir]/explorer_pkg/app/index.html

Options
-------

The build_explorer tasks accepts a few options:

  --extraPaths - comma-separated list of extra paths to look for
    necessary files. You can use this option to help the explorer
    locate bolt_touch for non-standard bolt installations. E.g.,
    bolt_touch is under ./foo/bar/bolt_touch, you can pass
    --extraPaths=./foo/bar and the explorer will find it.

  --examplesPath - specify this if you want to look for examples somewhere
    other than the current directory

  --explorerPkg - use this is you want the output directory (explorer_pkg)
    to be named something else

  --assetsDir - use this to specify a directory with static
    assets. These assets will be deep-copied into the explorer app's
    output directory (by default, explorer_pkg/app)

Whenever you run build_explorer, the task creates a local cache of
specified options in ./.bolt_explorer_cache - the next time you run
the task, it'll load the options from this file, unless you specify
new options. If you do, these new options will be used and will go to
./.bolt_explorer_cache.
