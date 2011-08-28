var http = require('http');
var dnode = require('dnode');
var express = require('express');
var _ = require('underscore');

var app = express.createServer();
app.use(express.bodyParser());

var yetis = {};

function obj_length(obj){
  var x = 0;
  for(i in obj){
    x++;
  }
  return x;
}

var dserver_port = parseInt(process.env.MC_DNODE_PORT) || 1337;
var dserver = dnode(function (client, conn){
  yetis[conn.id] = {client: client, conn: conn};
  conn.on('end', function(){
    delete yetis[conn.id];
  });
  this.finished = function(results){
  }
}).listen(dserver_port);
console.log('dnode lisening on ' + dserver_port);

var mc = {
  set: function(req, res){
    var target = req.body.target;
    var individual_concurrency = Math.floor(req.body.concurrency / obj_length(yetis));
    var max_requests = req.body.max_requests;
    target.max_requests = max_requests;
    target.concurrency = individual_concurrency;
    var target_json = JSON.stringify(target);
    var res_obj = {};
    var yetis_expected = obj_length(yetis);
    _.each(yetis, function(yeti, id){
      yeti.client.set(target_json, function(err, status){
        res_obj[yeti.conn.stream.remoteAddress+':'+yeti.conn.stream.remotePort] = {
          status: status
        };
        yeti.status = status;
        if(obj_length(res_obj) == yetis_expected){
          res.send(JSON.stringify(res_obj));
        }
      });
    });
  },
  start: function(req, res){
    var yetis_to_start = {};
    for(i in yetis){
      if(yetis[i].status == "awaiting commands"){
        yetis_to_start[i] = yetis[i];
      }
    }
    var res_obj = {};
    _.each(yetis_to_start, function(yeti_to_start, id){
      yeti_to_start.client.start(function(err, status){
        res_obj[yeti_to_start.conn.stream.remoteAddress+':'+yeti_to_start.conn.stream.remotePort] = {
          status: status
        };
        yeti_to_start.status = status;
        if(obj_length(res_obj) == obj_length(yetis_to_start)){
          res.send(JSON.stringify(res_obj));
        }
      });
    });
  },
  stop: function(req, res){
    var yetis_to_stop = {};
    for(i in yetis){
      if(yetis[i].status == "attacking"){
        yetis_to_stop[i] = yetis[i];
      }
    }
    var res_obj = {};
    _.each(yetis_to_stop, function(yeti_to_stop, id){
      yeti_to_stop.client.stop(function(err, status){
        res_obj[yeti_to_stop.conn.stream.remoteAddress+':'+yeti_to_stop.conn.stream.remotePort] = {
          status: status
        };
        yeti_to_stop.status = status;
        if(obj_length(res_obj) == obj_length(yetis_to_stop)){
          res.send(JSON.stringify(res_obj));
        }
      });
    });
  },
  status: function(req, res){
    var yetis_to_status = {};
    for(i in yetis){
      if(yetis[i].status == "attacking"){
        yetis_to_status[i] = yetis[i];
      }
    }
    var res_obj = {};
    _.each(yetis_to_status, function(yeti_to_status, id){
      yeti_to_status.client.status(function(err, status){
        res_obj[yeti_to_status.conn.stream.remoteAddress+':'+yeti_to_status.conn.stream.remotePort] = {
          status: status
        };
        yeti_to_status.status = status;
        if(obj_length(res_obj) == obj_length(yetis_to_status)){
          res.send(JSON.stringify(res_obj));
        }
      });
    }); 
  }
}

app.post('/set', function(req, res){
  mc.set(req, res);
});

app.post('/start', function(req, res){
  mc.start(req, res);
});

app.post('/stop', function(req, res){
  mc.stop(req, res);
});

app.post('/status', function(req, res){
  mc.status(req, res);
});

app.listen(parseInt(process.env.MC_HTTP_PORT) || 31337, '127.0.0.1');
console.log('http listening on ' + app.address().port);
