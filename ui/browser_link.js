var async = require('async');
var mongo = require('mongoose').mongo;
var model = require('../model');
var dnode = require('dnode');
var config = require('../config');

exports.initialize = function(mc_client){
  var mongo_store_client = new mongo.Db(config.session_db, new mongo.Server("127.0.0.1", 27017, {}));
  var sessions;
  mongo_store_client.open(function(err){
    if(err){
      callback('Error opening mongo store: ' + err);
    } else {
      mongo_store_client.collection('sessions', function(err, local_sessions){
        if(err){
          callback('Error binding to mongo collection: ' + err);
        } else {
          sessions = local_sessions;
        }
      });
    }
  });
  var connections = {};
  return dnode(function(client, conn){
    conn.on('ready', function(){
      console.log('browser connected: '+conn.id);
      connections[conn.id] = {};
    });

    conn.on('end', function(){
      console.log('browser disconnected: '+conn.id);
      delete(connections[conn.id]);
    });

    this.handshake = function(session_id, callback){
      sessions.find({'_id': session_id}).toArray(function(err, results){
        if(err){
          callback('Error finding session: ' + err);
        } else {
          if(results.length >= 1){
            connections[conn.id].session = JSON.parse(results[0].session);
            model.Account.findById(connections[conn.id].session.account_id, function(err, account){
              if(err){
                callback('load_account error: '+err);
              } else {
                connections[conn.id].account = account;
                callback();
              }
            }); 
          } else {
            callback('Error: session not found');
          }
          callback();
        }
      });
    };

    this.report = function(test_id, test_run_id, since, cb){
      if(!connections[conn.id].account){
        cb('account not set');
        return;
      }
      var test = connections[conn.id].account.tests.id(test_id);
      if(!test.verified || !test.test_runs.id(test_run_id)){
        cb('permission denied');
        return;
      }

      var yeti_id = test.yeti;

      async.parallel({
        report: function(callback){
          mc_client.report(test_run_id, since, function(err, report_res){
            // Necessary due to dnode bug to stringify objects
            if(err){
              callback(err);
            } else {
              report_res = JSON.parse(report_res);
              callback(null, report_res);
            }
          });
        },
        status: function(callback){
          mc_client.status(yeti_id, function(err, status_res){
            if(err){
              callback(err);
            } else {
              callback(null, status_res);
            }
          });
        }
      }, function(err, results){
        if(err){
          cb(err);
        } else {
          console.log("sending some results");
          cb(null, results);
        }
      });

    }

  });
}
