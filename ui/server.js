var express = require('express');
var mongoose = require('mongoose');
var controller = require('./controller');
var model = require('../model');
var session = require('./session');
var mc = require('../mc/client');

var mc_dnode_port = parseInt(process.env.MC_HTTP_PORT) || 31337;
var mc_client = mc.createClient(mc_dnode_port);

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
  express.session({ secret: "magicpants" }),
  session.load_account()
);

app.set('view engine', 'ejs');
app.set('view options', {
    open: '{{',
    close: '}}'
});

controller.routes(app, mc_client);

app.listen(port);
console.log('listening on '+port);


