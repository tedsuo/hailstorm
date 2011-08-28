var crypto = require('crypto');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongo_connection = require('./config').mongo_connection;
mongoose.connect(mongo_connection);

function hash(password) {
  return crypto.createHash('sha1').update(password).digest('hex');
}

var Yeti = new Schema({
    host      : String
  , port      : Number
});

var Test = new Schema({
    host      : String
  , port      : Number
  , protocol  : String
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

