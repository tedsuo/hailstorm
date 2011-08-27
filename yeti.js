var http = require('http');
var express = require('express');

var app = express.createServer();

// in case people are curious what a yeti is
app.get('/', function(req, res) {
        res.send('<html><title>you have encountered a hailstorm yeti</title><style>body {text-align:center; background-color:#000000; color:#cc0000;}</style><head><head><body><h1>you have encountered a HAILSTORM yeti</h1><img src="http://mysticinvestigations.com/supernatural/wp-content/uploads/2011/01/yeti-snowman.jpg"></body></html>');
});

// yeti's settings
app.post('/settings', function(req, res) {
    res.send('');
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
