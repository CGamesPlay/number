var test_util = require('./test_util');

describe('bolt tasks', function() {
  it('displays a list of tasks', function() {
    test_util.boltExec('tasks', function(err, stdout, stderr) {
      expect(err).toBe(null);
      expect(stdout.indexOf('Tasks:')).not.toEqual(-1);
      expect(stdout.indexOf('build')).not.toEqual(-1);
    });
  });
});
