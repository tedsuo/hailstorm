var crypto = require('crypto');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.connect(process.env.MONGO_CONNECT || 'mongodb://localhost/hailstorm');

function hash(password) {
  return crypto.createHash('sha1').update(password).digest('hex');
}

function validator_host(host) {
  if(!host || host == '') return false;

  var valid_ip_address = "^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$";
  var valid_hostname = "^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$";
  if(!host.match(valid_ip_address) && !host.match(valid_hostname)) return false;

  return true;
}

function validator_port(port) {
  var port = Number(port);
  if(port <= 0 || port > 65535) return false;
  return true;
}

function validator_protocol(protocol) {
  if(protocol != 'http' && protocol != 'https') return false;
  return true;
}

var Yeti = new Schema({
    host      : String
  , port      : Number
});

var Test = new Schema({
    host      : { type:String, validate:[ validator_host, 'invalid host' ] }
  , port      : { type:Number, validate:[ validator_port, 'invalid port' ] }
  , protocol  : { type:String, validate:[ validator_protocol, 'invalid protocol' ] }
  , verified  : Boolean
  , requests  : String
  , results   : String
});

var Account = new Schema({
    username  : String
  , password  : { type:String, set:hash }
  , tests     : [Test]
  , yetis     : [Yeti]
});
Account.statics.find_by_username_and_password = function(username, password, cb) {
  this.find({ username:username, password:hash(password) }, function(err,docs){
    if(err) { 
      cb(err);
    } else {
      if(docs.length == 0) {
        cb(['user not found']);
      } else {
        cb(null, docs[0]);
      }
    }
  })
};

exports.Yeti = mongoose.model('Yeti', Yeti);
exports.Test = mongoose.model('Test', Test);
exports.Account = mongoose.model('Account', Account);

exports.create_account = function(username, password, cb) {
  var account = new exports.Account({ username:username, password:password });
  account.save(function(err){
    if(err) {
      cb(err);
    } else {
      cb(null, account);
    }
  });
};

exports.does_username_exist = function(username, cb) {
  exports.Account.find({ username:username }, function(err, docs){
    if(err) {
      cb(err);
    } else {
      cb(err, (docs.length > 0));
    }
  });
};

