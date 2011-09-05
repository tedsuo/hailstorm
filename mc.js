var http = require('http');
var dnode = require('dnode');
var express = require('express');
var _ = require('underscore');
var mongoose = require('mongoose');
var model = require('./ui/model');

var yetis = {};
var cloud = {};

var yeti_server_port = parseInt(process.env.YETI_DNODE_PORT) || 1337;
var yeti_server = dnode(function (client, conn){
  var yeti = {client: client, conn: conn, data:{}}
  conn.on('ready',function(){
    client.getId( function(err,id){
      console.log('yeti '+id+' arrived');
      yeti.id = id;
      yetis[id] = yeti;
    });  
  });

  conn.on('end', function(){
    console.log('yeti '+yeti.id+' left');
    delete yetis[yeti.id];
  });
  
  this.report = function(result){
    var current_count = 0;
    var rounded_response = Math.round(result.response_time / 100);
    var rounded_start_time = Math.ceil(result.start_time / 5000);
    if(yeti.data[result.status_code] == undefined){
      yeti.data[result.status_code] = {};
    }
    if(yeti.data[result.status_code][rounded_start_time] == undefined){
      yeti.data[result.status_code][rounded_start_time] = {};
    }
    if(yeti.data[result.status_code][rounded_start_time][rounded_response] == undefined){
      yeti.data[result.status_code][rounded_start_time][rounded_response] = 0;
    }
    current_count = yeti.data[result.status_code][rounded_start_time][rounded_response]++;
    if(yeti.max_responses < current_count){
      yeti.max_responses = current_count;
    }
  }
  
  this.updateYetiStatus = function(status){
    yeti.status = status;
    model.Account.findById(yeti.account_id, function(err, account) {
      if(err){
        console.log(err);
        return;
      }
      var test = account.tests.id(yeti.test_id);
      if(status == 'attacking'){
        test.running = true;
        test.save(function(err){
          if(err){
            console.log(err);
          }
        });
      }
    });
  };
  
  this.finished = function(){
    model.Account.findById(yeti.account_id, function(err, account) {
      if(err){
        console.log(err);
        return;
      }
      console.log('Yeti '+yeti.id+' finished Test '+yeti.test_id+' for account '+yeti.account_id);
      var test = account.tests.id(yeti.test_id);
      test.results = JSON.stringify({data: yeti.data, max_responses: yeti.max_responses});
      test.running = false;
      test.save(function(err){
        if(err){
          console.log(err);
        }
        cloud.client.destroy(yeti.id,function(err){
          if(err){
            console.log('couldn\'t kill yeti'+yeti.id);
          } else {
            console.log('killed yeti '+yeti.id);
          }
        });        
      });
    });    
  };
}).listen(yeti_server_port, '0.0.0.0');
console.log('yeti server listening on ' + yeti_server_port);

var cloud_server_port = parseInt(process.env.CLOUD_DNODE_PORT) || 1338;
var cloud_server = dnode(function (client, conn){
  console.log('cloud arrived');  
  cloud = {client: client, conn: conn};
  
  conn.on('end', function(){
    console.log('cloud left');  
    cloud = undefined;
  });
  
}).listen(cloud_server_port, '0.0.0.0');
console.log('cloud server listening on ' + cloud_server_port);

var mc = {
  list: function(req, res){
    res.send(JSON.stringify(Object.keys(yetis)));
  },
  
  create: function(req,res){
    cloud.client.create(function(err, yeti_id){
      res.send(JSON.stringify({yeti_id:yeti_id}));
    });
  },

  destroy: function(req,res){
    var yeti = yetis[req.params.id];  
    if(!yeti){    
      res.writeHead(500);
      res.end('yeti does not exit');
      return;
    }
    cloud.client.destroy(yeti.id,function(err){
      if(err){
        res.writeHead(500);
        res.end(err.message);
      } else {
        res.send('success');
      }
    });
  },
    
  set: function(req, res){
    var yeti = yetis[req.params.id];  
    if(!yeti){    
      res.writeHead(500);
      res.end('yeti does not exit');
      return;
    }

    yeti.account_id = req.body.account_id;
    yeti.test_id = req.body.test_id;
    yeti.data = {};
    yeti.max_responses = 0;
        
    var target = req.body.target;
    target.max_requests = req.body.max_requests;
    target.concurrency = req.body.concurrency;

    var res_obj = {};    
    yeti.client.set(JSON.stringify(target), function(err, status){
      res_obj[yeti.id] = {
        status: status
      };
      yeti.status = status;
      res.send(JSON.stringify(res_obj));
    });
  },
  
  start: function(req, res){
    var yeti = yetis[req.params.id];
    if(!yeti){    
      res.writeHead(500);
      res.end('yeti does not exit');
      return;
    }
    if( yeti.status !== "ready"){
      res.writeHead(500);
      res.end('yeti not ready');
      return;
    }
    var res_obj = {};
    yeti.client.start(function(err, status){
      res_obj[yeti.id] = {
        status: status
      };
      yeti.status = status;
      res.send(JSON.stringify(res_obj));
    });
  },
  
  stop: function(req, res){
    var yeti = yetis[req.params.id];
    if(!yeti){    
      res.writeHead(500);
      res.end('yeti does not exit');
      return;
    }
    var res_obj = {};    
    yeti.client.stop(function(err, status){
      res_obj[yeti.id] = {
        status: status
      };
      yeti.status = status;
      res.send(JSON.stringify(res_obj));
    });
  },
  
  status: function(req, res){
    var yeti = yetis[req.params.id];
    if(!yeti){    
      res.writeHead(500);
      res.end('yeti does not exit');
      return;
    }
    var res_obj = {};
    yeti.client.status(function(err, status){
      res_obj[yeti.id] = status;
      yeti.status = status.status;
      res.send(JSON.stringify(res_obj));
    });
  },
  
  report: function(req, res){
    var yeti = yetis[req.params.id];
    if(!yeti){    
      res.writeHead(500);
      res.end('yeti does not exit');
      return;
    }    
    if(!yeti){
      res.writeHead(200);
      res.end();
    }
    res.send(JSON.stringify({data: yeti.data, max_responses: yeti.max_responses}));
  }
}


var app = express.createServer();
app.use(express.bodyParser());

app.get('/', function(req, res){
  mc.list(req, res);
});

app.post('/create', function(req, res){
  mc.create(req, res);
});

app.post('/destroy/:id', function(req, res){
  mc.destroy(req, res);
});

app.post('/set/:id', function(req, res){
  mc.set(req, res);
});

app.post('/start/:id', function(req, res){
  mc.start(req, res);
});

app.post('/stop/:id', function(req, res){
  mc.stop(req, res);
});

app.get('/status/:id', function(req, res){
  mc.status(req, res);
});

app.get('/report/:id', function(req, res){
  mc.report(req, res);
});

app.listen(parseInt(process.env.MC_HTTP_PORT) || 31337, '127.0.0.1');
console.log('http listening on ' + app.address().port);
