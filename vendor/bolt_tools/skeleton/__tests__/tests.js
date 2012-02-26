// bolt comes with the jasmine testing frmaework already set up. If you want to
// use something different, just modify the package.json in this folder and
// update the test.html file accordingly
//
// Replace these tests with your own.

describe('bolt', function() {
  beforeEach(function() {
    this.addMatchers({
      toBeAwesome: function() {
        return (this.actual === 'bolt');
      }
    });
  });

  it('should be awesome', function() {
    expect('bolt').toBeAwesome();
  });
});

describe('this test', function() {
  it('should fail', function() {
    expect(true).toBe(false);
  });
});
