var http = require('http');
var dnode = require('dnode');
var _ = require('underscore');
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

  // when we receive a chunked report, save it to the db
  this.report = function(id, result){
    model.Account.findById(cloud.tests[id].account_id, function(err, account){
      if(err){
        console.log(err);
        return
      }
      console.log("Report Received:"+JSON.stringify(result));
      var test = account.tests.id(id);
      var test_run_id = test.test_runs[test.test_runs.length - 1]._id;
      _.each(result, function(status_code_obj, status_code){
        _.each(status_code_obj, function(method_obj, method){
          _.each(method_obj, function(path_obj, path){
            _.each(path_obj, function(end_time_obj, end_time){
              _.each(end_time_obj, function(start_time_obj, start_time){
                model.Report.update({
                  test_run_id : test_run_id,
                  status_code : status_code,
                  method      : method,
                  path        : path,
                  end_time    : end_time,
                  start_time  : start_time,
                }, {
                  $inc: {count: start_time_obj.count}
                }, {
                  upsert: true
                }, function(err){
                  if(err){
                    console.log(err);
                  }
                });
              });
            });
          }); 
        });
      });
    });
  }
  
  // this has to be pluralized
  this.updateTestStatus = function(id, status){
    cloud.tests[id].status = status;
    model.Account.findById(cloud.tests[id].account_id, function(err, account) {
      if(err){
        console.log(err);
        return;
      }
      var test = account.tests.id(id);
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
    mc_clients[id].emit('complete');
/*
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
*/  
  };
}).listen(cloud_server_port, '0.0.0.0');
console.log('cloud server listening on ' + cloud_server_port);

var mc_clients = {};
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
    mc_clients[id] = client;
    
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
        callback(null,results);
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
      if(cloud.tests[id] && (cloud.tests[id].status == 'created')){ 
        cloud.tests[id].account_id = data.account_id;
        cloud.tests[id].max_responses = 0;
        
        cloud_sets[i] = function(callback){
          cloud.client.set(id, data.target, function(err, status){
            if(err){
              callback(err); // TODO: or retry...
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
    var num = _.size(cloud_sets);
    data.target.max_requests = Math.floor(data.max_requests / num);
    data.target.concurrency = Math.floor(data.concurrency / num);
    async.parallel(cloud_sets, function(err, results){
      if(err){
        callback(err);
      } else {
        // do we want to create a new test_run record on every set?
        model.Account.findById(data.account_id, function(err, account){
          if(err){
            callback(err);
            return;
          }
          test = account.tests.id(id);
          test_run = new model.TestRun({});
          console.log('Created TestRun with id: '+test_run._id);
          test.test_runs.push(test_run);
          account.save(function(err){
            if(err){
              callback(err);
              return;
            }
            callback(null, results, test_run.id);
          });
        });
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
              callback(err);
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

}).listen(mc_dnode_port, '0.0.0.0');

console.log('mc dnode listening on ' + mc_dnode_port);
