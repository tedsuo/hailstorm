// Assumes both yeti and hailstorm are running and connected

var http = require('http');
var mc = require('../mc/client');
var util = require('util');
var assert = require('assert');

var TEST_ID = 456;
var MAX_REQUESTS = 20;
var CONCURRENCY = 5;
var TARGET_PORT = 8667;
var TEST_DATA = {
  concurrency: CONCURRENCY,
  max_requests: MAX_REQUESTS,
  target:{
    protocol: 'http',
    host: 'localhost',
    port: TARGET_PORT,      
    requests:[
      {method:'get', path:'/test'}
    ]
  },      
};

var requests_received = 0;

// punching bag we are going to beat on
http.createServer(function(req,res){
  res.end('OK');
  ++requests_received;
  console.log('PING ' + requests_received);
}).listen(TARGET_PORT);
console.log('punching bag listening on port '+TARGET_PORT);


// create a test, run it, check that it sends the correct number of tests
var mc_client = mc.createClient();

mc_client
  .create(TEST_ID,function(err,data){
    console.log('created');
    console.log(arguments);
  })
  .set(TEST_ID,TEST_DATA,function(err,data){
    console.log('set');
    console.log(arguments);
  })
  .start(TEST_ID,function(err,data){
    console.log('started');
    console.log(arguments);
  });


// assert successful completion
mc_client.on('complete',function(){
  assert.equal( requests_received, MAX_REQUESTS);
  console.log('test complete');
  process.exit();
});

setTimeout(function(){
  console.log('test timed out');
  process.exit();
},2000);