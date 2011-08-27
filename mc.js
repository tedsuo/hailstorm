var http = require('http');
var dnode = require('dnode');
var express = require('express');

var app = express.createServer();
app.use(express.bodyParser());

var yettis = {};

var dserver = dnode(function (client, conn){
  this.callIn = function(){
    yettis[conn.id] = {client: client, conn: conn};
    conn.on('end', function(){
      delete yettis[conn.id];
    });
  };
}).listen(1337);

function set_charge_orders(req, res){
  var target = req.body.target;
  var individual_concurrency = Math.floor(req.body.concurrency / yettis.length);
  var max_requests = req.body.max_requests;
  target.max_requests = max_requests;
  target.concurrency = individual_concurrency;
  var target_json = JSON.stringify(target);
  var res_array = [];
  for(i in yettis){
    console.log('yeti');
    yettis[i].client.set(target_json, function(err, status){
      console.log(status);
    }); 
  }
  res.send('test');
}

app.post('/set_charge_orders', function(req, res){
  set_charge_orders(req, res);
});

app.listen(parseInt(process.env.MC_PORT) || 31337, '127.0.0.1');
console.log('Lisening on ' + app.address().port);
