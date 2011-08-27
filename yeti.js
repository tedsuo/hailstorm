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
    this.stop(); // hammer time
    // TODO: needs error checking on settings 
    this.settings = JSON.parse(settings);
    this.settings.status = 'awaiting commands';

    this.agent = this.get_protocol().globalAgent;
    this.agent.maxSockets = this.settings.concurrency;

    console.log(this.settings);
    callback(null, this.settings.status);
  },
  // returns http or https
  get_protocol : function() {
    if(this.settings && this.settings.protocol == 'https')
      return https;
    else
      return http;
  },
  start : function(callback){
    this.settings.status = 'attacking';
    var num_requests = 0;
    this.request_log = [];
    this.requests_sent = 0;
    while(num_requests < this.settings.max_requests) {
        for(var i=0; i < this.settings.requests.length; i++) {
            console.log('sending request '+num_requests+': '+JSON.stringify(this.settings.requests[i]));
            
            // start a log for this request
            this.request_log[num_requests] = {
                method: this.settings.requests[i].method,
                path: this.settings.requests[i].path
            };

            // make the request
            var options = {
                host: this.settings.host,
                port: this.settings.port,
                method: this.settings.requests[i].method,
                path: this.settings.requests[i].path,
                headers: {
                    //'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0) Gecko/20100101 Firefox/6.0',
                    'User-Agent': 'I AM YETI AND YOU ARE STUCK IN HAILSTORM',
                    'Connection': 'keep-alive'
                }
            }
            var req = this.get_protocol().request(options, function(res){
                this.request_log[this.request_id].end_time = new Date().getTime();
                this.request_log[this.request_id].response_time = this.request_log[this.request_id].end_time - this.request_log[this.request_id].start_time;
                this.request_log[this.request_id].status_code = res.statusCode;
                console.log('request '+this.request_id+' '+this.request_log[this.request_id].method+' '+this.request_log[this.request_id].path+' finished with code '+this.request_log[this.request_id].status_code+' in '+this.request_log[this.request_id].response_time+' ms');
                res.on('end', function(){this.requests_sent++});
            });
            req.request_id = num_requests;
            req.on('error', function(e){
                console.log('request '+this.request_id+' error: '+e.message);
            });
            req.on('socket', function(socket){
                this.request_log[this.request_id].start_time = new Date().getTime();
            });
            if(this.settings.requests[i].body)
                req.write(this.settings.requests[i].body);
            req.end();

            num_requests++;
            if(num_requests == this.settings.max_requests) break;
        }
    }
    console.log(this.settings.status);
    callback(err, this.settings.status);
  },
  stop : function() {
    this.settings.status = 'hibernating';
    if(this.agent) this.agent.queue = [];
  },
  status : function(callback) {
    if(this.settings.max_requests == this.requests_sent) {
        this.settings.status = 'catching breath';
    }

    callback({
        status: this.settings.status,
        requests_sent: this.requests_sent
    });
  }
}

// make sure 'this' is always yeti when in yeti
for(i in yeti) {
  if( typeof(yeti[i]) == 'function' ){
    yeti[i].bind(yeti);
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
  console.log('Connected to MC on '+ yeti.mc_port + '\n Awaiting Orders...');
});



