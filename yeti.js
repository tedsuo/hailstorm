//vim: ts=2 sw=2 expandtab
var http = require('http');
var https = require('https');
var express = require('express');
var dnode = require('dnode');


// yeti's settings
var yeti = {
  mc_port: 1337,
  settings : {},
  requests_sent: 0,
  request_log: {},
  set : function(settings, callback){
    // expects post body to be a json object with: protocol (http or https), port, host, requests, max_requests, concurrency
    yeti.stop(); // hammer time
    // TODO: needs error checking on settings 
    yeti.settings = JSON.parse(settings);
    yeti.settings.status = 'awaiting commands';

    yeti.agent = yeti.get_protocol().globalAgent;
    yeti.agent.maxSockets = yeti.settings.concurrency;

    console.log(yeti.settings);
    callback(null, yeti.settings.status);
  },
  // returns http or https
  get_protocol : function() {
    if(yeti.settings && yeti.settings.protocol == 'https')
      return https;
    else
      return http;
  },
  start : function(callback){
    yeti.settings.status = 'attacking';
    var num_requests = 0;
    yeti.request_log = [];
    yeti.requests_sent = 0;
    while(num_requests < yeti.settings.max_requests) {
        for(var i=0; i < yeti.settings.requests.length; i++) {
            console.log('sending request '+num_requests+': '+JSON.stringify(yeti.settings.requests[i]));
            
            // start a log for yeti request
            yeti.request_log[num_requests] = {
                method: yeti.settings.requests[i].method,
                path: yeti.settings.requests[i].path
            };

            // make the request
            var options = {
                host: yeti.settings.host,
                port: yeti.settings.port,
                method: yeti.settings.requests[i].method,
                path: yeti.settings.requests[i].path,
                headers: {
                    //'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0) Gecko/20100101 Firefox/6.0',
                    'User-Agent': 'I AM YETI AND YOU ARE STUCK IN HAILSTORM',
                    'Connection': 'keep-alive'
                }
            }
            var req = yeti.get_protocol().request(options, function(res){
                yeti.request_log[yeti.request_id].end_time = new Date().getTime();
                yeti.request_log[yeti.request_id].response_time = yeti.request_log[yeti.request_id].end_time - yeti.request_log[yeti.request_id].start_time;
                yeti.request_log[yeti.request_id].status_code = res.statusCode;
                console.log('request '+yeti.request_id+' '+yeti.request_log[yeti.request_id].method+' '+yeti.request_log[yeti.request_id].path+' finished with code '+yeti.request_log[yeti.request_id].status_code+' in '+yeti.request_log[yeti.request_id].response_time+' ms');
                res.on('end', function(){yeti.requests_sent++});
            });
            req.request_id = num_requests;
            req.on('error', function(e){
                console.log('request '+yeti.request_id+' error: '+e.message);
            });
            req.on('socket', function(socket){
                yeti.request_log[yeti.request_id].start_time = new Date().getTime();
            });
            if(yeti.settings.requests[i].body)
                req.write(yeti.settings.requests[i].body);
            req.end();

            num_requests++;
            if(num_requests == yeti.settings.max_requests) break;
        }
    }
    console.log(yeti.settings.status);
    callback(err, yeti.settings.status);
  },
  stop : function() {
    yeti.settings.status = 'hibernating';
    if(yeti.agent) yeti.agent.queue = [];
  },
  status : function(callback) {
    if(yeti.settings.max_requests == yeti.requests_sent) {
        yeti.settings.status = 'catching breath';
    }

    callback({
        status: yeti.settings.status,
        requests_sent: yeti.requests_sent
    });
  }
}


// attacking or hibernating
// total requests 

var client = dnode({
  set : yeti.set,
  start: yeti.start,
  stop: yeti.stop,
  status: yeti.status
});

client.connect(yeti.mc_port, function(remote, conn){
  remote.callIn();
  console.log('Connected to MC on '+ yeti.mc_port + '\n Awaiting Orders...');
});



