var http = require('http');
var dnode = require('dnode');
var _ = require('underscore');
var model = require('../model');
var async = require('async');

var yetis = {};

var yeti_server_port = parseInt(process.env.CLOUD_DNODE_PORT) || 1338;
var yeti_server = dnode(function (client, conn){
  console.log('yeti arrived: '+conn.id);  
  var yeti = {client: client, conn: conn, tests: {}};
  conn.on('ready', function(){
    yetis[conn.id] = yeti;
  });
  conn.on('end', function(){
    console.log('yeti left: '+conn.id);  
    delete yetis[conn.id];
    delete yeti;
  });

  // when we receive a chunked report, save it to the db
  this.report = function(id, result){
    model.Account.findById(yeti.tests[id].account_id, function(err, account){
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
    yeti.tests[id].status = status;
    model.Account.findById(yeti.tests[id].account_id, function(err, account) {
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
    model.Account.findById(yeti.tests[id].account_id, function(err, account) {
      if(err){
        console.log(err);
        return;
      }
      console.log('Cloud '+conn.id+' finished test '+id+' for account '+yeti.tests[id].account_id);
      var test = account.tests.id(id);
      test.results = JSON.stringify({data: yeti.tests[id].data, max_responses: yeti.tests[id].max_responses});
      test.running = false;
      test.save(function(err){
        if(err){
          console.log(err);
        }
        yeti.client.destroy(id,function(err){
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
}).listen(yeti_server_port, '0.0.0.0');
console.log('yeti server listening on ' + yeti_server_port);

var mc_clients = {};
var mc_dnode_port = parseInt(process.env.MC_HTTP_PORT) || 31337;
var mc = dnode(function (client, conn){
  conn.on('ready',function(){
  });

  conn.on('end', function(){
  });

  this.list = function(callback){
    callback(Object.keys(yetis));
  };
  
  this.create = function(id, callback){
    mc_clients[id] = client;
    
    if(yetis.length == 0){
      callback('no yetis available');
      return;
    }
    
    var yeti_creates = {};
    _.each(yetis, function(yeti, i){
      yeti_creates[i] = function(callback){
        yeti.client.create(id, function(err){
          if(err){
            callback(null,{result: 'error', message: err});
          } else {
            if(yeti.tests[id] == undefined){
              yeti.tests[id] = {};
            }
            yeti.tests[id].status = 'created';
            callback(null, {result: 'success'});
          }
        });
      };
    });

    async.parallel(yeti_creates, function(err, results){
      if(err){
        callback(err);
      } else {
        callback(null,results);
      }
    });
  };

  this.destroy = function(id, callback){
    var yeti_destroys = {};
    _.each(yetis, function(yeti, i){
      if(yeti.tests[id]){
        yeti_destroys[i] = function(callback){
          yeti.client.destroy(id,function(err){
            delete yeti.tests[id];
            if(err){
              callback(null, {result: 'error', err: err.message});
            } else {
              callback(null, {result: 'success'});
            }
          });
        };
      };
    });

    if(_.size(yeti_destroys) == 0){
      callback('no yetis with test id'+id);
      return;
    }

    async.parallel(yeti_destroys, function(err, results){
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

    var yeti_sets = {};
    _.each(yetis, function(yeti, i){
      if(yeti.tests[id] && (yeti.tests[id].status == 'created')){ 
        yeti.tests[id].account_id = data.account_id;
        yeti.tests[id].max_responses = 0;
        yeti_sets[i] = function(callback){
          yeti.client.set(id, data.target, function(err, status){
            if(err){
              callback(err); // TODO: or retry...
            } else {
              yeti.tests[id].status = status;
              callback(null, {result: 'success'});
            }
          });
        };
      }
    });

    if(_.size(yeti_sets) == 0){
      callback('no yetis with status "created" with test id '+id);
      return;
    }
    var num = _.size(yeti_sets);
    data.target.max_requests = Math.floor(data.max_requests / num);
    data.target.concurrency = Math.floor(data.concurrency / num);
    async.parallel(yeti_sets, function(err, results){
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
    var yeti_starts = {};
    _.each(yetis, function(yeti, i){
      if(yeti.tests[id].status == "ready" && yeti.tests[id]){
        yeti_starts[i] = function(callback){
          yeti.client.start(id, function(err, status){
            if(err){
              callback(err);
            } else {
              yeti.tests[id].status = status;
              callback(null, {result: 'success'});
            }
          });
        }
      }
    });
    if(_.size(yeti_starts) == 0){
      callback('no yetis with status "ready" with test id '+id);
      return;
    }
    
    async.parallel(yeti_starts, function(err, results){
      if(err){
        callback(err);
      } else {
        callback(null, results);
      }
    });
  };

  this.stop = function(id, callback){
    var yeti_stops = {};
    _.each(yetis, function(yeti, i){
      if(yeti.tests[id].status == "attacking" && yeti.tests[id]){
        yeti_stops[i] = function(callback){
          yeti.client.stop(id, function(err, status){
            if(err){
              callback(null, {result: 'error', err: err});
            } else {
              yeti.tests[id].status = status;
              callback(null, {result: 'success'});
            }
          });
        }
      }
    });
    if(_.size(yeti_stops) == 0){
      callback('no yetis with status "attacking" with test id '+id);
      return;
    }
    
    async.parallel(yeti_stops, function(err, results){
      if(err){
        callback(err);
      } else {
        callback(null, results);
      }
    });
  };

  this.status = function(id, callback){
    var yeti_statuses = {};
    _.each(yetis, function(yeti, i){
      if(yeti.tests[id]){
        yeti_statuses[i] = function(callback){
          yeti.client.status(id, function(err, status){
            if(err){
              callback(null, {result: 'error', err: err});
            } else {
              yeti.tests[id].status = status;
              callback(null, {status: status});
            }
          });
        }
      }
    });
    if(_.size(yeti_statuses) == 0){
      callback('no yetis with test id '+id);
      return;
    }
    
    async.parallel(yeti_statuses, function(err, results){
      if(err){
        callback(err);
      } else {
        callback(null, results);
      }
    });
  };

  this.report = function(id, callback){
    console.log("this.report in server.js");
    model.Report.find({
      test_run_id: id
    }, function(err, docs){
      if(err){
        callback(err);
      } else {
        var data_agg = {};
        var max_responses_total = 0;
        _.each(docs, function(doc){
          if(data_agg[doc.status_code] == undefined){
            data_agg[doc.status_code] = {};
          }
          if(data_agg[doc.status_code][doc.start_time] == undefined){
            data_agg[doc.status_code][doc.start_time] = {};
          }
          if(data_agg[doc.status_code][doc.start_time][doc.response_time] == undefined){
            data_agg[doc.status_code][doc.start_time][doc.response_time] = doc.count;
          } else {
            data_agg[doc.status_code][doc.start_time][doc.response_time] += doc.count;
          }
          if(data_agg[doc.status_code][doc.start_time][doc.response_time] > max_responses_total){
            max_responses_total = data_agg[doc.status_code][doc.start_time][doc.response_time];
          }
        });
        // Necessary due to dnode bug to stringify objects
        callback(null, JSON.stringify({data: data_agg, max_responses: max_responses_total}));
      }
    });
  };
}).listen(mc_dnode_port, '0.0.0.0');

console.log('mc dnode listening on ' + mc_dnode_port);
