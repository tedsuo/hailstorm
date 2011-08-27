var http = require('http');
var express = require('express');

var app = express.createServer();
app.use(express.bodyParser());

function set_charge_orders(req, res, charge_statuses){
  var yettis = req.body.yettis;
  var target = req.body.target;
  var individual_concurrency = Math.floor(req.body.concurrency / yettis.length);
  var max_requests = req.body.max_requests;
  target.max_requests = max_requests;
  target.concurrency = individual_concurrency;
  var target_json = JSON.stringify(target);
  var res_array = [];
  for(i in yettis){
    var options = {
      host: yettis[i],
      port: 80,
      method: 'GET',
      path: '/'
    };
    var yettireq = http.request(options, function(resp){
      if(resp.statusCode != "200"){
        res_array.push(yettis[this.request_id] + " response: " + resp.statusCode);
      } else {
        res_array.push(yettis[this.request_id] + " non-200 response: " + resp.statusCode);
      }/*
      resp.request_id = this.request_id;
      resp.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
      });*/
      if(res_array.length == yettis.length){
        res.send(res_array.join("<br />"));
      }
    });
    yettireq.request_id = i;
    yettireq.end();
  }
}

app.post('/set_charge_orders', function(req, res){
  var charge_statuses = {};
  set_charge_orders(req, res, charge_statuses, charge_statuses);
});

app.listen(parseInt(process.env.MC_PORT) || 31337, '127.0.0.1');
console.log('Lisening on ' + app.address().port);
