var _ = require('underscore');
var crypto = require('crypto');
var http = require('http');
var https = require('https');
var model = require('./model');
var http = require('http');

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

function verify_filename(req, test) {
    return 'hailstorm_'+crypto.createHash('md5').update(req.account.username+test.host).digest('hex').substring(0,6)+'.html';
}
function verify_file_body() {
    return 'I hereby consent to getting hailstormed';
}
function verify_website(test) {
  var website = test.protocol+'://'+test.host;
  if((test.protocol == 'http' && test.port != 80) || (test.protocol == 'https' && test.port != 443)) {
    website += ':'+test.port;
  }
  return website;
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
      verified : false,
      requests : JSON.stringify(requests),
      results : []
    };
    req.account.tests.push(test);
    req.account.save();
    res.redirect('/dashboard');
  });

  app.get('/test/run/:id',function(req,res){
    if(!force_authentication(req, res)) return;
    var test = req.account.tests.id(req.params.id);
    console.log(test);
    if(!test.verified) {
      render('/dashboard');
      return;
    }
    res.render('test_run',_.extend(logged_in(req),{test : test})); 
  });

  app.post('/test/run', function(req, res){
    if(!force_authentication(req, res)) return;
    var test = req.account.tests.id(req.body.test_id);
    var requests = JSON.parse(test.requests);
    if(!test.verified) {
      render('/dashboard');
      return;
    }
    payload = {
      target : {
        protocol : test.protocol,
        port : Number(test.port),
        host : test.host,
        requests : requests
      },
      concurrency : Number(req.body.concurrency), 
      max_requests : Number(req.body.max_requests),
    };

    payload = JSON.stringify(payload); 
    console.log(payload);
    var queue = http.request(
      { 
        host: "127.0.0.1", 
        port : 31337, 
        method : 'POST', 
        path : '/set', 
        headers : {'Content-Type' : "application/json"}
      }, 
      function(set_res){
        set_res.on('end', function(){
          console.log('ok it was set');
          var start = http.request( { host: "127.0.0.1", port : 31337, method : 'POST', path : '/start', });
          start.end();
        });
      }
    ); 
    queue.write(payload);
    queue.end();
    res.render('dashboard', _.extend(logged_in(req), { account: req.account }));
  });

  app.get('/test/verify/:id', function(req,res){
    if(!force_authentication(req, res)) return;
    
    var test = req.account.tests.id(req.params.id);
   
    var filename = verify_filename(req, test);
    var file_body = verify_file_body();
    var website = verify_website(test);
    
    var params = {
      test: test,
      verify_filename: filename,
      verify_body: file_body,
      website: website
    };
    res.render('verify', _.extend(logged_in(req), params));
  });

  app.get('/test/verify/download/:id', function(req, res){
    if(!force_authentication(req, res)) return;
    // todo: make it generate the file described above
  });

  app.post('/test/verify/:id', function(req,res){
    if(!force_authentication(req, res)) return;

    if(req.body.submit == 'Cancel and go back') {
      res.redirect('/dashboard');
      return;
    }
    var test = req.account.tests.id(req.params.id);
    
    var filename = verify_filename(req, test);
    var file_body = verify_file_body();
    var website = verify_website(test);
    
    console.log('verifying website: '+website);

    var protocol_to_use;
    if(test.protocol == 'https') {
      protocol_to_use = https;
    } else {
      protocol_to_use = http;
    }
    
    function verification_failed() {
      console.log('verification failed');
      var params = {
        test: test,
        verify_filename: filename,
        verify_body: file_body,
        website: website,
        errors: ['Verification failed, do a better job and try again']
      };
      res.render('verify', _.extend(logged_in(req), params));
    }
    
    var options = {
      host: test.host,
      port: test.port,
      method: 'GET',
      path: '/'+filename
    };
    var verify_req = protocol_to_use.request(options, function(verify_res){
      var body = '';
      verify_res.on('data', function(chunk) { body += chunk; });
      verify_res.on('end', function(){
        var verified = false;
        if(verify_res.statusCode == 200 && body.indexOf(file_body) != -1) {
          // verified!
          console.log('website verified');
          test.verified = true;
          req.account.save(function(err){
            if(err) console.log('error saving test: '+err);
            res.redirect('/dashboard');
          });
        } else {
          verification_failed();
        }
      });
    });
    verify_req.on('error', function(){
      verification_failed();
    });
    verify_req.end();
  });
};
