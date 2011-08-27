var express = require('express');
var controller = require('./controller');
var model = require('./model');

if(process.env.NODE_ENV == 'production'){
  port = 80;
} else {
  port = 9003;
}

var app = express.createServer(
  express.static(__dirname + '/public'),
  express.cookieParser(),
  express.session({ secret: "magicpants" }),
  model.setUser()
);

app.set('view engine', 'ejs');

app.set('view options', {
    open: '{{',
    close: '}}'
});

controller.routes(app);

app.listen(port);
console.log('listening on '+port);
