var express = require('express');
var mongoose = require('mongoose');
var controller = require('./controller');
var model = require('./model');

/*var account = new model.Account({ username:'test', password:'test'});
account.save(function(err){
  if(err) console.log(err);
  else console.log('success!');
});*/

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
