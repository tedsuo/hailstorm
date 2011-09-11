var dnode = require('dnode');

exports.createClient = function(port,host){
  var options = {};
  options.port = port || 31337;
  options.host = host || "localhost";
  options.reconnect = 1000;
  var mc_client = dnode.connect(options, function(remote, conn){
    conn.on('ready', function(){
      mc_client.conn = conn;
      mc_client.remote = remote;
      console.log('Connected to mc on port '+options.port);
      mc_client.connected = true;
    });
    conn.on('end', function(){
      mc_client.connected = false;
      delete(mc_client.conn);
      delete(mc_client.remote);
      console.log('Disconnected from mc');
    });
  });
  return mc_client;
}

