var http = require('http');
var dnode = require('dnode');
var _ = require('underscore');
var mongoose = require('mongoose');
var model = require('../model');
var async = require('async');

var clouds = {};

var cloud_server_port = parseInt(process.env.CLOUD_DNODE_PORT) || 1338;
var cloud_server = dnode(function (client, conn){
  console.log('cloud arrived: '+conn.id);  
  var cloud = {client: client, conn: conn, tests: {}};
  conn.on('ready', function(){
    clouds[conn.id] = cloud;
  });
  conn.on('end', function(){
    console.log('cloud left: '+conn.id);  
    delete clouds[conn.id];
    delete cloud;
  });

  this.report = function(id, result){
    var current_count = 0;
    var rounded_response = Math.round(result.response_time / 100);
    var rounded_start_time = Math.ceil(result.start_time / 5000);
    if(cloud.tests[id].data[result.status_code] == undefined){
      cloud.tests[id].data[result.status_code] = {};
    }
    if(cloud.tests[id].data[result.status_code][rounded_start_time] == undefined){
      cloud.tests[id].data[result.status_code][rounded_start_time] = {};
    }
    if(cloud.tests[id].data[result.status_code][rounded_start_time][rounded_response] == undefined){
      cloud.tests[id].data[result.status_code][rounded_start_time][rounded_response] = 0;
    }
    current_count = cloud.tests[id].data[result.status_code][rounded_start_time][rounded_response]++;
    if(cloud.tests[id].max_responses < current_count){
      cloud.tests[id].max_responses = current_count;
    }
  }
  
  // this has to be pluralized
  this.updateTestStatus = function(id, status){
    cloud.tests[id].status = status;
    model.Account.findById(cloud.tests[id].account_id, function(err, account) {
      if(err){
        console.log(err);
        return;
      }
      var test = account.tests.id(cloud.tests[id].test_id);
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
  
  // must be pluralized
  this.finished = function(id){
    model.Account.findById(cloud.tests[id].account_id, function(err, account) {
      if(err){
        console.log(err);
        return;
      }
      console.log('Cloud '+conn.id+' finished test '+id+' for account '+cloud.tests[id].account_id);
      var test = account.tests.id(id);
      test.results = JSON.stringify({data: cloud.tests[id].data, max_responses: cloud.tests[id].max_responses});
      test.running = false;
      test.save(function(err){
        if(err){
          console.log(err);
        }
        cloud.client.destroy(id,function(err){
          if(err){
            console.log('couldn\'t kill test '+id);
          } else {
            console.log('killed test '+id);
          }
        });        
      });
    });    
  };
  
}).listen(cloud_server_port, '0.0.0.0');
console.log('cloud server listening on ' + cloud_server_port);

var mc_dnode_port = parseInt(process.env.MC_HTTP_PORT) || 31337;
var mc = dnode(function (client, conn){
  conn.on('ready',function(){
  });

  conn.on('end', function(){
  });

  this.list = function(callback){
    callback(Object.keys(clouds));
  };
  
  this.create = function(id, callback){
    if(clouds.length == 0){
      callback('no clouds available');
      return;
    }
    
    var cloud_creates = {};
    _.each(clouds, function(cloud, i){
      cloud_creates[i] = function(callback){
        cloud.client.create(id, function(err){
          if(err){
            callback(null,{result: 'error', message: err});
          } else {
            if(cloud.tests[id] == undefined){
              cloud.tests[id] = {};
            }
            cloud.tests[id].status = 'created';
            callback(null, {result: 'success'});
          }
        });
      };
    });

    async.parallel(cloud_creates, function(err, results){
      if(err){
        callback(err);
      } else {
        callback();
      }
    });
  };

  this.destroy = function(id, callback){
    var cloud_destroys = {};
    _.each(clouds, function(cloud, i){
      if(cloud.tests[id]){
        cloud_destroys[i] = function(callback){
          cloud.client.destroy(id,function(err){
            delete cloud.tests[id];
            if(err){
              callback(null, {result: 'error', err: err.message});
            } else {
              callback(null, {result: 'success'});
            }
          });
        };
      };
    });

    if(_.size(cloud_destroys) == 0){
      callback('no clouds with test id'+id);
      return;
    }

    async.parallel(cloud_destroys, function(err, results){
      if(err){
        callback(err);
      } else {
        callback(null, 'success');
      }
    });
  };

  this.set = function(id, data, callback){
    function target_calculate(num){
      var target = data.target;
      target.max_requests = Math.floor(data.max_requests / num);
      target.concurrency = Math.floor(data.concurrency / num);
      return target;
    }
    var cloud_sets = {};
    _.each(clouds, function(cloud, i){
      if(cloud.tests[id].status == 'created' && cloud.tests[id]){ 
        cloud.tests[id].account_id = data.account_id;
        cloud.tests[id].data = {};
        cloud.tests[id].max_responses = 0;
        
        cloud_sets[i] = function(callback){
          cloud.client.set(id, target_calculate(_.size(cloud_sets)), function(err, status){
            if(err){
              callback(null, {result: 'error', message: err});
            } else {
              cloud.tests[id].status = status;
              callback(null, {result: 'success'});
            }
          });
        };
      }
    });

    if(_.size(cloud_sets) == 0){
      callback('no clouds with status "created" with test id '+id);
      return;
    }

    async.parallel(cloud_sets, function(err, results){
      if(err){
        callback(err);
      } else {
        callback(null, results);
      }
    });
  };

  this.start = function(id, callback){
    var cloud_starts = {};
    _.each(clouds, function(cloud, i){
      if(cloud.tests[id].status == "ready" && cloud.tests[id]){
        cloud_starts[i] = function(callback){
          cloud.client.start(id, function(err, status){
            if(err){
              callback(null, {result: 'error', err: err});
            } else {
              cloud.tests[id].status = status;
              callback(null, {result: 'success'});
            }
          });
        }
      }
    });
    if(_.size(cloud_starts) == 0){
      callback('no clouds with status "ready" with test id '+id);
      return;
    }
    
    async.parallel(cloud_starts, function(err, results){
      if(err){
        callback(err);
      } else {
        callback(null, results);
      }
    });
  };

  this.stop = function(id, callback){
    var cloud_stops = {};
    _.each(clouds, function(cloud, i){
      if(cloud.tests[id].status == "attacking" && cloud.tests[id]){
        cloud_stops[i] = function(callback){
          cloud.client.stop(id, function(err, status){
            if(err){
              callback(null, {result: 'error', err: err});
            } else {
              cloud.tests[id].status = status;
              callback(null, {result: 'success'});
            }
          });
        }
      }
    });
    if(_.size(cloud_stops) == 0){
      callback('no clouds with status "attacking" with test id '+id);
      return;
    }
    
    async.parallel(cloud_stops, function(err, results){
      if(err){
        callback(err);
      } else {
        callback(null, results);
      }
    });
  };

  this.status = function(id, callback){
    var cloud_statuses = {};
    _.each(clouds, function(cloud, i){
      if(cloud.tests[id]){
        cloud_statuses[i] = function(callback){
          cloud.client.status(id, function(err, status){
            if(err){
              callback(null, {result: 'error', err: err});
            } else {
              cloud.tests[id].status = status;
              callback(null, {status: status});
            }
          });
        }
      }
    });
    if(_.size(cloud_statuses) == 0){
      callback('no clouds with test id '+id);
      return;
    }
    
    async.parallel(cloud_statuses, function(err, results){
      if(err){
        callback(err);
      } else {
        callback(null, results);
      }
    });
  };

  this.report = function(id, callback){
    var data_agg = {};
    var max_responses_total = 0;
    var num_tests = 0;
    _.each(clouds, function(cloud, i){
      if(cloud.tests[id]){
        num_tests++;
        _.each(cloud.tests[id].data, function(status_code_obj, status_code){
          if(data_agg[status_code] == undefined){
            data_agg[status_code] = {};
          }
          _.each(status_code_obj, function(st_obj, st){
            if(data_agg[status_code][st] == undefined){
              data_agg[status_code][st] = {};
            }
            _.each(st_obj, function(resp_val, resp){
              if(data_agg[status_code][st][resp] == undefined){
                data_agg[status_code][st][resp] = 0;
              }
              data_agg[status_code][st][resp] += resp_val;
              if(data_agg[status_code][st][resp] > max_responses_total){
                max_responses_total = data_agg[status_code][st][resp];
              }
            });
          });
        });        
      }
    });
   
    if(num_tests == 0){
      callback('no clouds with test id '+id);
      return;
    }
    
    callback(null, {data: data_agg, max_responses: max_responses_total});
  };
}).listen(mc_dnode_port, '0.0.0.0');

console.log('mc dnode listening on ' + mc_dnode_port);
