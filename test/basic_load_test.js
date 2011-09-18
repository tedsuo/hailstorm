// Assumes both yeti and hailstorm are running and connected

var http = require('http');
var mc = require('../mc/client');
var util = require('util');
var assert = require('assert');
var i = 0;

http.createServer(function(req,res){
  res.end('OK');
  console.log('PING ' + ++i);
}).listen(8666);
console.log('punching bag listening on port 8666');

mc_client = mc.createClient();
mc_client.on('ready',function(){
  console.log('ready');
  mc_client.remote.create(function(err,data){
    console.log('created');
    console.log(arguments);
    var yeti_id = data.yeti_id;
    test_data = {
      concurrency: 5,
      max_requests: 20,
      target:{
        protocol: 'http',
        host: 'localhost',
        port: 8666,
      },
      requests:[
        {method:'get', path:'/test'}
      ]
    };
    mc_client.remote.set(yeti_id,test_data,function(err,data){
      console.log('set');
      console.log(arguments);
      mc_client.remote.start(yeti_id,function(err,data){
        console.log('started');
        console.log(arguments);
      });
    });
  });
});

