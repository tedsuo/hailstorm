var http = require('http');

var app = http.createServer(function (req, res) {
res.writeHead(200, { 'Content-Type': 'text/html' });
res.end('<html><title>you have encountered a hailstorm yeti</title><style>body {text-align:center; background-color:#000000; color:#cc0000;}</style><head><head><body><h1>you have encountered a HAILSTORM yeti</h1><img src="http://mysticinvestigations.com/supernatural/wp-content/uploads/2011/01/yeti-snowman.jpg"></body></html>');
});

app.listen(parseInt(process.env.PORT) || 1337);
console.log('Listening on ' + app.address().port);
