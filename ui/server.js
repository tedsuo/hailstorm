var express = require('express');
var MongoStore = require('connect-mongo');
var controller = require('./controller');
var session = require('./session');
var mc = require('../mc/client');
var mc_dnode_port = parseInt(process.env.MC_HTTP_PORT) || 31337;
var mc_client = mc.createClient(mc_dnode_port);
var config = require('../config');
var browser_link = require('./browser_link');
var browser_dnode = browser_link.initialize(mc_client);

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
  express.session({ secret: "magicpants", store: new MongoStore({db: config.session_db}) }),
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

browser_dnode.listen(app);
