var express = require('express');
var mongoose = require('mongoose');
var controller = require('./controller');
var model = require('./model');
var session = require('./session');
var dnode = require('dnode');

var mc_dnode_port = parseInt(process.env.MC_HTTP_PORT) || 31337;
var mc_client = dnode.connect(mc_dnode_port, function(remote, conn){
  conn.on('ready', function(){
    mc_client.conn = conn;
    mc_client.remote = remote;
    console.log('Connected to mc on port '+mc_dnode_port);
    mc_client.connected = true;
  });
  conn.on('end', function(){
    mc_client.connected = false;
    delete(mc_client.conn);
    delete(mc_client.remote);
    console.log('Disconnected from mc');
  });
}, {reconnect: 1000});

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


