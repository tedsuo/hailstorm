var http = require('http');
var https = require('https');

var Yeti = function(o){
  this.remote = undefined;
  this.settings = {};
  this.requests_sent = 0;
  this.request_log = {};
};

Yeti.prototype.set = function(settings, callback){
  // expects post body to be a json object with: protocol (http or https), port, host, requests, max_requests, concurrency
  this.stop(); // hammer time
  // TODO: needs error checking on settings 
  this.settings = JSON.parse(settings);
  this.settings.status = 'awaiting commands';

  this.agent = this.get_protocol().globalAgent;
  this.agent.maxSockets = this.settings.concurrency;

  console.log(this.settings);
  callback(null, this.settings.status);
};

// returns http or https
Yeti.prototype.get_protocol = function() {
  if(this.settings && this.settings.protocol == 'https')
    return https;
  else
    return http;
};

Yeti.prototype.start = function(callback){
  this.settings.status = 'attacking';
  this.num_requests = 0;
  this.request_log = [];
  this.requests_sent = 0;
  while(this.num_requests < this.settings.max_requests) {
    this.settings.requests.forEach(this.attack.bind(this));
  }
  console.log(this.settings.status);
  callback(null, this.settings.status);
};

Yeti.prototype.stop = function() {
  this.settings.status = 'hibernating';
  if(this.agent) this.agent.queue = [];
};

Yeti.prototype.status = function(callback) {
  if(this.settings.max_requests == this.requests_sent) {
      this.settings.status = 'catching breath';
  }

  callback({
      status: this.settings.status,
      requests_sent: this.requests_sent
  });
};

Yeti.prototype.attack = function(req_data){
  var yeti = this;
  if(this.num_requests == this.settings.max_requests) return;      
  var request_id = this.num_requests;
  this.request_log[request_id] = {};
  
  console.log('sending request '+this.num_requests+': '+JSON.stringify(req_data));
  
  // start a log for yeti request
  this.request_log[this.num_requests] = {
    method: req_data.method,
    path: req_data.path
  };

  // make the request
  var options = {
    host: this.settings.host,
    port: this.settings.port,
    method: req_data.method,
    path: req_data.path,
    headers: {
        //'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0) Gecko/20100101 Firefox/6.0',
        'User-Agent': 'I AM YETI AND YOU ARE STUCK IN HAILSTORM',
        'Connection': 'keep-alive'
    }
  }
  
  var req = this.get_protocol().request(options, function(res){
    res.on('end', function(){
      yeti.on_request_end(request_id,res);
    });
  });

  req.on('error', function(e){
    console.log('request '+request_id+' error: '+e.message);
  });
  
  req.on('socket', function(){
    yeti.on_request_start(request_id);
  });
  
  if(request_id.body) req.write(request_id.body);
  
  req.end();

  this.num_requests++;
};

Yeti.prototype.on_request_start = function(request_id){
  this.request_log[request_id].start_time = new Date().getTime();
};

Yeti.prototype.on_request_end = function(request_id,res){
  this.request_log[request_id].end_time = new Date().getTime();
  this.request_log[request_id].response_time = this.request_log[request_id].end_time - this.request_log[request_id].start_time;
  this.request_log[request_id].status_code = res.statusCode;          
  this.requests_sent++;
  console.log('request '+request_id+' '+this.request_log[request_id].method+' '+this.request_log[request_id].path+' finished with code '+this.request_log[request_id].status_code+' in '+this.request_log[request_id].response_time+' ms');            
};

module.exports = Yeti;