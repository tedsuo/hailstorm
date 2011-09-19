var dnode = require('dnode');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var async = require('async');

exports.createClient = function(port,host){
  var options = {};
  options.port = port || 31337;
  options.host = host || "localhost";
  options.reconnect = 1000;

  var mc_client = new Client();

  dnode({
    emit: function(){
      mc_client.emit.apply(mc_client,arguments);
    }
  }).connect(options, function(remote, conn){
    conn.on('ready', function(){
      mc_client.conn = conn;
      mc_client.remote = remote;
      console.log('Connected to mc on port '+options.port);
      mc_client.connected = true;
      mc_client.emit('ready');
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

var Client = function(){

  // we queue remote commands when disconnected  
  this._queue = [];  
  // disconnected by default
  this.state = 'disconnected';
      
  this.on('ready',function(){
    var old_state = this.state;
    this.state = 'connected';
    this.emit('transition '+old_state+':'+this.state);
  });
  
  this.on('transition disconnected:connected',function(){
    this.drain();
  });
};

util.inherits(Client, EventEmitter);

Client.prototype.create = function(id,callback){
  var client = this;
  this.queue(function(done){
    client.remote.create(id,function(){
      callback();
      done();
    });
  });
  return this;
}

Client.prototype.set = function(id,data,callback){
  var client = this;
  this.queue(function(done){
    client.remote.set(id,data,function(){
      callback();
      done();
    });
  });
  return this;
}

Client.prototype.start = function(id,callback){
  var client = this;
  this.queue(function(done){
    client.remote.start(id,function(){
      callback();
      done();
    });
  });
  return this;
}

Client.prototype.on_complete = function(id,callback){
  var client = this;
  this.queue(function(done){
    client.remote.on_complete(id,function(){
      callback();
      done();
    });
  });
  return this;
}

Client.prototype.queue = function(callback){
  switch(this.state){
    case 'connected':
      callback(function(){});
      break;
    default:
      this._queue.push(callback);
  };
}

Client.prototype.drain = function(){
  var client = this;
  async.series(this._queue,function(){
    client._queue = [];
  });
}