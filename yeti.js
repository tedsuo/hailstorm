var http = require('http');
var express = require('express');

// settings for this yeti
var settings = {
    protocol: 'http',
    port: 80,
    domain: '',
    uri_list: [],
    max_requests: 100,
    concurrency: 10
};

// return an error
function error(res, error_message) {
    res.send(error_message, 500);
}

// here be the web server!
var app = express.createServer();
app.use(express.bodyParser());

// in case people are curious what a yeti is
app.get('/', function(req, res) {
        res.send('<html><title>you have encountered a hailstorm yeti</title><style>body {text-align:center; background-color:#000000; color:#cc0000;}</style><head><head><body><h1>you have encountered a HAILSTORM yeti</h1><img src="http://mysticinvestigations.com/supernatural/wp-content/uploads/2011/01/yeti-snowman.jpg"></body></html>');
});

// yeti's settings
// expects: protocol (http or https), port, domain, uri_list, max_requests, concurrency
app.post('/settings', function(req, res) {
    // validate
    if(req.body.protocol != 'http' && req.body.protocol != 'https') {
        error('Protocol must be "http" or "https"');
        return;
    }
    if(Number(req.body.port <= 0 || req.body.port > 365535) {
        error('Invalid port');
        return;
    }
    // change the settings
    settings = {
        protocol: req.body.protocol,
        port: req.body.port,
        domain: req.body.domain,
        targets: req.body.targets,
        max_requests: req.body.max_requests,
        concurrency: req.body.concurrency
    }
    res.send('ready to fire');
});

// start
app.post('/start', function(req, res) {
    res.send('');
});

// stop
app.post('/stop', function(req, res) {
    res.send('');
});

// status
app.get('/status', function(req, res) {
    res.send('');
});

app.listen(parseInt(process.env.YETI_PORT) || 1337);
console.log('Listening on ' + app.address().port);
