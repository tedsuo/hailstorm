var crypto = require('crypto');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.connect(process.env.MONGO_CONNECT || 'mongodb://localhost/hailstorm');

function hash(password) {
  return crypto.createHash('sha1').update(password).digest('hex');
}

var Report = new Schema({
  test_run_id : String,
  status_code : Number,
  method      : String,
  path        : String,
  end_time    : Number,
  start_time  : Number,
  count       : Number
});

Report.virtual('response_time').get(function(){
  return this.end_time - this.start_time;
});

var TestRun = new Schema({});

var Test = new Schema({
  host      : String,
  port      : Number,
  protocol  : String,
  verified  : Boolean,
  requests  : String,
  test_runs : [TestRun],
  running   : Boolean,
  yeti      : String
});

var Account = new Schema({
  username : String,
  password : { type:String, set:hash },
  tests    : [Test]
});

Account.statics.find_by_username_and_password = function(username, password, cb){
  this.find({ username:username, password:hash(password) }, function(err,docs){
    if(err) { 
      cb(err);
    } else {
      if(docs.length == 0) {
        cb('Invalid login');
      } else {
        cb(null, docs[0]);
      }
    }
  })
};

exports.Test = mongoose.model('Test', Test);
exports.TestRun = mongoose.model('TestRun', TestRun);
exports.Account = mongoose.model('Account', Account);
exports.Report = mongoose.model('Report', Report);

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
