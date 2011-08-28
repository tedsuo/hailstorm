//vim: ts=2 sw=2 expandtab
var dnode = require('dnode');
var Yeti = require('./yeti');

var yeti;

// attacking or hibernating
// total requests
var client = dnode({
  create: function(callback){
    console.log('create!!');
    callback(null,'create');
  }
});

if(process.env.NODE_ENV == 'production'){
  client.connect('hailstorm.no.de',1338, function(remote, conn){
    client.remote = remote;
    client.remote_conn = conn;
    console.log('Connected to MC on hailstorm.no.de:1337\n Awaiting Orders...');
  });
} else {
  client.connect(1338, function(remote, conn){
    client.remote = remote;
    client.remote_conn = conn;
    console.log('Connected to MC on localhost:1337\n Awaiting Orders...');
  });
}
