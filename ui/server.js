var express = require('express');
var mongoose = require('mongoose');
var controller = require('./controller');
var model = require('./model');
var session = require('./session');

if(process.env.NODE_ENV == 'production'){
  port = 80;
} else {
  port = 9003;
}

var app = express.createServer(
  express.static(__dirname + '/public'),
  express.logger({ format: ':method :url' }),
  express.cookieParser(),
  express.bodyParser(),
  express.session({ secret: "magicpants", cookie: { maxAge: 60000 } }),
  session.load_account()
);

app.set('view engine', 'ejs');
app.set('view options', {
    open: '{{',
    close: '}}'
});

controller.routes(app);

app.listen(port);
console.log('listening on '+port);
