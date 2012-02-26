function MockDatabase() {
  this.data = [
    { uid: 693594821, name: "Ryan Patterson", number: 0 },
    { uid: 1112871867, name: "Mike Dodge", number: 50 }
  ];
}

MockDatabase.prototype.getNumbers = function(callback) {
  callback(null, this.data);
};

MockDatabase.prototype.addNumber = function(data, callback) {
  this.data.forEach(function(item) {
    if (item.uid == data.uid) {
      item.number += data.number;
    }
  });
  callback(null, null);
}

exports.MockDatabase = MockDatabase;
