var http = require('http');
var dnode = require('dnode');
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

var mc_dnode_port = parseInt(process.env.MC_HTTP_PORT) || 31337;
var mc = dnode(function (client, conn){
  conn.on('ready',function(){
  });

  conn.on('end', function(){
  });

  this.list = function(callback){
    callback(Object.keys(yetis));
  };
  
  this.create = function(callback){
    console.log(cloud);
    if(cloud.client == undefined){
      callback('cloud does not exist');
      return;
    }
    cloud.client.create(function(err, yeti_id){
      callback(null, {yeti_id:yeti_id});
    });
  };

  this.destroy = function(id, callback){
    var yeti = yetis[id];  
    if(!yeti){
      callback('yeti does not exist');
      return;
    }
    cloud.client.destroy(yeti.id,function(err){
      if(err){
        callback(err.message, null);
      } else {
        callback(null, 'success');
      }
    });
  };

  this.set = function(id, data, callback){
    var yeti = yetis[id];  
    if(!yeti){
      callback('yeti does not exit');
      return;
    }

    yeti.account_id = data.account_id;
    yeti.test_id = data.test_id;
    yeti.data = {};
    yeti.max_responses = 0;
        
    var target = data.target;
    target.max_requests = data.max_requests;
    target.concurrency = data.concurrency;

    var res_obj = {};    
    yeti.client.set(target, function(err, status){
      res_obj[yeti.id] = {
        status: status
      };
      yeti.status = status;
      callback(null,res_obj);
    });
  };

  this.start = function(id, callback){
    var yeti = yetis[id];
    if(!yeti){
      callback('yeti does not exist');
      return;
    }
    if( yeti.status !== "ready"){
      callback('yeti not ready');
      return;
    }
    var res_obj = {};
    yeti.client.start(function(err, status){
      res_obj[yeti.id] = {
        status: status
      };
      yeti.status = status;
      callback(null, res_obj);
    });
  };

  this.stop = function(id, callback){
    var yeti = yetis[id];
    if(!yeti){    
      callback('yeti does not exit');
      return;
    }
    var res_obj = {};    
    yeti.client.stop(function(err, status){
      res_obj[yeti.id] = {
        status: status
      };
      yeti.status = status;
      callback(null, JSON.stringify(res_obj));
    });
  };

  this.status = function(id, callback){
    var yeti = yetis[id];
    if(!yeti){    
      callback('yeti does not exit');
      return;
    }
    var res_obj = {};
    yeti.client.status(function(err, status){
      res_obj[yeti.id] = status;
      yeti.status = status.status;
      callback(null, res_obj);
    });
  };

  this.report = function(id, callback){
    var yeti = yetis[id];
    if(!yeti){    
      callback('yeti does not exit');
      return;
    }
    callback(null, {data: yeti.data, max_responses: yeti.max_responses});
  };
}).listen(mc_dnode_port, '0.0.0.0');

console.log('mc dnode listening on ' + mc_dnode_port);
