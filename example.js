// assumes hailstorm is runnning on localhost:8000


// command line interface
hailstorm = require('hailstorm');
load_test = hailstorm.source('./test_files/apache.log');
load_test.run();




// scripting interface
var hailstorm = require('hailstorm');
var load_test_data = require('./example_data');

var load_test = hailstorm
      .connect('localhost:8000')
      .createTest(test_data)
      .run({
        concurrency: 5000,
        max_requests: 2000000 
      });


