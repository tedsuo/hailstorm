var http = require('http');
var express = require('express');

var settings = {
    port: 6969
};

var app = express.createServer();
app.use(express.bodyParser());

app.post('/start', function(req, res) {
  //should take the following params
  // * amazon credentials
  // * number of servers to spin up
  // * group id
  //should create yetis
  //should start yetis
  //should verify that yetis are alive
  //report to ui that yetis are ready
});

app.post('/stop', function(req, res) {
  //should take the following params
  // * amazon credentials (or can get it from server)
  // * group id
  //should stop yetis
  //should destroy yetis
  //report to ui that yetis are dead
});

app.get('/status', function(req, res) {
  //should take the following params
  // * amazon credentials (or can get it from server)
  // * group id
  //reports status of each server associated with that account
});

app.listen(parseInt(process.env.DJPORT) || settings.port);
console.log('DJ is spinning on port ' + app.address().port);
