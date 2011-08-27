var http = require('http');
var dnode = require('dnode');
var express = require('express');
var _ = require('underscore');
var async = require('async');

var app = express.createServer();
app.use(express.bodyParser());

var yetis = {};

function obj_length(obj){
  x = 0;
  for(i in obj){
    x++;
  }
  return x;
}

var dserver = dnode(function (client, conn){
  yetis[conn.id] = {client: client, conn: conn};
  conn.on('end', function(){
    delete yetis[conn.id];
  });
}).listen(1337);

var mc = {
  set: function(req, res){
    var target = req.body.target;
    var individual_concurrency = Math.floor(req.body.concurrency / obj_length(yetis));
    var max_requests = req.body.max_requests;
    target.max_requests = max_requests;
    target.concurrency = individual_concurrency;
    var target_json = JSON.stringify(target);
    var res_array = [];
    var yetis_expected = obj_length(yetis);
    _.each(yetis, function(yeti, id){
      yeti.client.set(target_json, function(err, status){
        res_array.push(yeti.conn.stream.remoteAddress + " responded with: " + status);
        yeti.status = status;
        if(res_array.length == yetis_expected){
          res.send(res_array.join("<br />"));
        }
      });
    });
  },
  start: function(req, res){
    _.each(yetis, function(yeti, id){
      if(yeti.status == "awaiting commands"){
        yeti.client.start(function(err, status){
          console.log(status);
        });
      }
    });
  }
}

app.post('/set', function(req, res){
  mc.set(req, res);
});

app.post('/start', function(req, res){
  mc.start(req, res);
});

app.listen(parseInt(process.env.MC_PORT) || 31337, '127.0.0.1');
console.log('Lisening on ' + app.address().port);
