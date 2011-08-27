var http = require('http');
var https = require('https');
var express = require('express');

// settings for this yeti
var settings = {};
var request_log = {};
var requests_sent = 0;
var agent;

// returns http or https
function get_protocol() {
    if(settings && settings.protocol == 'https')
        return https;
    else
        return http;
}

// here be the web server!
var app = express.createServer();
app.use(express.bodyParser());
app.use(express.logger({ format: ':method :url' }));

// in case people are curious what a yeti is
app.get('/', function(req, res) {
    res.send('<html><title>you have encountered a hailstorm yeti</title><style>body {text-align:center; background-color:#000000; color:#cc0000;}</style><head><head><body><h1>you have encountered a HAILSTORM yeti</h1><img src="http://mysticinvestigations.com/supernatural/wp-content/uploads/2011/01/yeti-snowman.jpg"></body></html>');
});

// yeti's settings
// expects post body to be a json object with: protocol (http or https), port, host, requests, max_requests, concurrency
app.post('/settings', function(req, res) {
    stop(); // hammer time

    settings = req.body;
    settings.status = 'awaiting commands';

    get_protocol().globalAgent.maxSockets = settings.concurrency;

    console.log(settings);
    res.send(settings.status);
});

// start
app.post('/start', function(req, res) {
    settings.status = 'attacking';
    var num_requests = 0;
    request_log = [];
    requests_sent = 0;
    while(num_requests < settings.max_requests) {
        for(var i=0; i<settings.requests.length; i++) {
            console.log('sending request '+num_requests+': '+JSON.stringify(settings.requests[i]));
            
            // start a log for this request
            request_log[num_requests] = {
                method: settings.requests[i].method,
                path: settings.requests[i].path
            };

            // make the request
            var options = {
                host: settings.host,
                port: settings.port,
                method: settings.requests[i].method,
                path: settings.requests[i].path,
                headers: {
                    //'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:6.0) Gecko/20100101 Firefox/6.0',
                    'User-Agent': 'I AM YETI AND YOU ARE STUCK IN HAILSTORM',
                    'Connection': 'keep-alive'
                }
            }
            var req = get_protocol().request(options, function(res){
                request_log[this.request_id].end_time = new Date().getTime();
                request_log[this.request_id].response_time = request_log[this.request_id].end_time - request_log[this.request_id].start_time;
                request_log[this.request_id].status_code = res.statusCode;
                console.log('request '+this.request_id+' '+request_log[this.request_id].method+' '+request_log[this.request_id].path+' finished with code '+request_log[this.request_id].status_code+' in '+request_log[this.request_id].response_time+' ms');
                requests_sent++;
            });
            req.request_id = num_requests;
            req.on('error', function(e){
                console.log('request '+this.request_id+' error: '+e.message);
            });
            req.on('socket', function(socket){
                request_log[this.request_id].start_time = new Date().getTime();
            });
            if(settings.requests[i].body)
                req.write(settings.requests[i].body);
            req.end();

            num_requests++;
            if(num_requests == settings.max_requests) break;
        }
    }
    console.log(settings.status);
    res.send(settings.status);
});

// stop
function stop() {
    settings.status = 'hibernating';
    if(agent) agent.queue = [];
}
app.post('/stop', function(req, res) {
    stop();
    res.send(settings.status);
});

// status
app.get('/status', function(req, res) {
    if(settings.max_requests == requests_sent) {
        settings.status = 'catching breath';
    }

    if(settings.status == 'attacking') { 
        res.send({
            status: settings.status,
            requests_sent: requests_sent
        });
    } else {
        
    }
});

var port = parseInt(process.env.YETI_PORT) || 1337;
app.listen(port);
console.log('Listening on '+port);

// attacking or hibernating
// total requests 
//


