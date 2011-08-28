//vim: ts=2 sw=2 expandtab
var dnode = require('dnode');
var spawn = require('child_process').spawn;

yetis = [];

var mc_client = dnode({
  create: function(callback){
    var yeti = spawn('/opt/node-0.5.5/bin/node',
      [__dirname+'/yeti_server.js'],{
      env: process.env
    });
    yeti.yeti_id = yeti.pid;
    yetis[yeti.yeti_id] = yeti;


    yeti.on('exit',function(){
      console.log('yeti '+yeti.yeti_id+' died');
      delete yetis[yeti.yeti_id];
    });

    yeti.stdout.on('data',function(msg){
      console.log('YETI '+yeti.yeti_id+': '+msg);
    });
    
    callback(null,yeti.pid);
    console.log('created yeti '+yeti.yeti_id);
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
  console.log('Trying to connect to MC on hailstorm.radicaldesigns.org:1338');
  mc_client.connect(1338, function(remote, conn){
    mc_client.remote = remote;
    mc_client.remote_conn = conn;
    console.log('Connected to MC on hailstorm.radicaldesigns.org:1338');
  });
} else {
  console.log('Trying to connect to MC on localhost:1338');
  mc_client.connect(1338, function(remote, conn){
    mc_client.remote = remote;
    mc_client.remote_conn = conn;
    console.log('Connected to MC on localhost:1338');
  });
}
