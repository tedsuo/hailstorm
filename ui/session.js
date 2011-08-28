var model = require('./model');

exports.load_account = function(){
  return function(req, res, next){
    if(req.session && req.session.account_id) {
      model.Account.findById(req.session.account_id, function(err, account){
        if(err) console.log('load_account error: '+err);
        console.log('load_account setting req.account');
        req.account = account;
        next();
      });
    } else {
      next();
    }
  }
}
