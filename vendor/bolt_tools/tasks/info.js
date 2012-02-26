// Info Tasks
var fs = require('fs');
var path = require('path');

task('version', function() {
  var packageFile = fs.readFileSync(
    path.resolve(__dirname, '..', 'package.json'), 'utf8');
  var json = JSON.parse(packageFile);
  banner('tools version: ' + json.version);
});

desc('print a list of all defined tasks');
task('tasks', function() {
  banner('The following tasks have been defined');
  console.log('A default set of tasks is provided in the bolt_core Boltfile.');
  console.log('Create or edit your projects Boltfile to add more tasks.');

  console.log('Tasks:'.yellow);
  console.log('--------------------------------------');
  for (var taskName in tasks) {
    task = tasks[taskName];
    console.log(task.describe());
  }
});
