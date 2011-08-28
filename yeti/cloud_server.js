//vim: ts=2 sw=2 expandtab
var dnode = require('dnode');
var spawn = require('child_process').spawn;

yetis = [];

// attacking or hibernating
// total requests
var client = dnode({
  create: function(callback){
    var yeti = spawn('node',[__dirname+'/yeti_server.js']);
    yeti.yeti_id = yeti.pid;
    yetis[yeti.yeti_id] = yeti;
    console.log('created yeti '+yeti.yeti_id);
    callback(null,yeti.pid);
    yeti.on('exit',function(){
      console.log('yeti '+yeti.yeti_id+' died');
      delete yetis[yeti.yeti_id];
    });
  },
  
  destroy: function(yeti_id,callback){
    if(yetis[yeti_id]){
      yetis[yeti_id].kill();
      callback(null,'success');
    } else {
      callback(new Error('yeti '+yeti_id+' does not exit'));
    }
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
