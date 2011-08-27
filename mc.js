var http = require('http');
var express = require('express');

var app = express.createServer();
app.use(express.bodyParser());

function set_charge_orders(req, res){
  var yettis = req.body.yettis;
  var target = req.body.target;
  var individual_concurrency = Math.floor(req.body.concurrency / yettis.length);
  var max_requests = req.body.max_requests;
  target.max_requests = max_requests;
  target.concurrency = individual_concurrency;
  var target_json = JSON.stringify(target);
  for(i in yettis){
    var options = {
      host: yettis[i],
      port: 1337,
      method: 'POST',
      path: '/settings',
      headers: {"Content-Type": "application/json"}
    };
    http.request(options);
  }
  res.send('Requests Sent');
}

app.post('/charge', function(req, res){
  set_charge_orders(req, res);
});

app.listen(parseInt(process.env.MC_PORT) || 31337, '127.0.0.1');
console.log('Lisening on ' + app.address().port);
