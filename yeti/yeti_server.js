//vim: ts=2 sw=2 expandtab
var dnode = require('dnode');
var Yeti = require('./yeti');

var yeti;

yeti = new Yeti();
    
var mc_client = dnode({
  getId: function(callback){
    callback(null,process.pid);
  },
  set: function(settings, callback){
    yeti.set(settings, callback);
  },
  start: function(callback){
    yeti.start(callback);
  },
  stop: function(callback){
    yeti.stop();
    callback(null, yeti.status);
  },
  status: function(callback){
    yeti.getStatus(callback);
  }
});

if(process.env.NODE_ENV == 'production'){
  mc_client.connect('hailstorm.no.de',1337, function(remote, conn){
    mc_client.remote = remote;
    mc_client.remote_conn = conn;
    yeti.remote = remote;
    yeti.status = 'awaiting commands';
    console.log('Connected to MC on hailstorm.no.de:1337\n Awaiting Orders...');
  });
} else {
  mc_client.connect(1337, function(remote, conn){
    mc_client.remote = remote;
    mc_client.remote_conn = conn;
    yeti.remote = remote;
    yeti.status = 'awaiting commands';    
    console.log('Connected to MC on localhost:1337\n Awaiting Orders...');
  });
}
