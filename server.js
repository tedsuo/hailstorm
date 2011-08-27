var http = require('http');
var nko = require('nko')('sOlBQnEkup4F/fL4');

var app = http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('Get ready for the hailstorm! >:) ');
});

app.listen(parseInt(process.env.PORT) || 7777);
console.log('Listening on ' + app.address().port);
