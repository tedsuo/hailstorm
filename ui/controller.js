var _ = require('underscore');
var model = require('./model');

function force_authentication(req, res) {
  if(req.account) {
    return true;
  }
  res.redirect('/login');
  return false;
}

function logged_in(req) {
  if(req.account)
    return { logged_in:true };
  else
    return { logged_in:false };
}

exports.routes = function(app){
  app.get('/',function(req,res){
    res.render('index', logged_in(req));
  });

  app.get('/dashboard', function(req,res){
    if(!force_authentication(req, res)) return;
      res.render('dashboard', _.extend(logged_in(req), { account: req.account }));
  });

  app.get('/register',function(req,res){
    res.render('register', logged_in(req));
  });

  app.post('/register',function(req,res){
    function render_errors(errors) {
      var params = { 
        username: req.body.username,
        password: req.body.password,
        errors: errors
      };
      res.render('register', _.extend(logged_in(req), params));
    }

    var errors = [];
    if(req.body.username == '' || req.body.password == '') {
      errors.push('Username and password are required');
    }
    model.does_username_exist(req.body.username, function(err, exists){
      if(err) {
        errors.push(err);
      } else {
        if(exists) {
          errors.push('That username is taken');
        }
        
        // if there are errors print them
        if(errors.length > 0) {
          render_errors(errors);
        }
        // otherwise create account
        else {
          model.create_account(req.body.username, req.body.password, function(err, account) {
            if(err) {
              errors.push(err);
              render_errors(errors);
            } else {
              req.session.account_id = account._id;
              res.redirect('/dashboard');
            }
          });
        }
      }
    });
  });

  app.get('/login',function(req,res){
    res.render('login', logged_in(req));
  }); 
  
  app.post('/login',function(req,res){
    function render_errors(errors) {
      var params = { 
        username: req.body.username,
        password: req.body.password,
        errors: errors
      };
      res.render('login', _.extend(logged_in(req), params));
    }

    var errors = [];
    if(req.body.username == '' || req.body.password == '') {
      errors.push('Invalid login');
      render_errors(errors);
      return;
    }
    model.Account.find_by_username_and_password(req.body.username, req.body.password, function(err, account){
      if(err) {
        errors.push(err);
      } else {
        if(!account) {
          errors.push('Something weird happened, I guess you can\'t login');
        }
        
        // if there are errors print them
        if(errors.length > 0) {
          render_errors(errors);
        }
        // otherwise login
        else {
          req.session.account_id = account._id;
          res.redirect('/dashboard');
          console.log('login successful! '+JSON.stringify(account));
        }
      }
    });
  }); 

  app.get('/logout', function(req,res){
    if(!force_authentication(req, res)) return;
    req.session.destroy(function(err){
      if(err) console.log('error destroying session: '+err);
      res.redirect('/');
    });
  });
  
  app.get('/about',function(req,res){
    res.render('about', logged_in(req));
  }); 

  app.post('/test/new',function(req,res){
    if(!force_authentication(req, res)) return;
    
    var paths = req.body.requests.split('\r\n');
    var requests = [];
    for( var i in paths) {
      requests.push({ method : 'GET', path : paths[i], body : '' });
    }
    var test = {
      host : req.body.url,
      port : 80,
      protocol : 'http',
      verified : true,
      requests : requests,
      results : []
    };
    req.account.tests.push(test);
    req.account.save();
    res.redirect('/dashboard');
  });
};
