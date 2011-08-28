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

function get_req_options(){
  return { 
    host: "127.0.0.1", 
    port : 31337
  };
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
    console.log('/test/new');

    // validation
    var errors = [];
    req.body.host = req.body.host.replace(/\/$/, ''); // remove trailing slash
    if(!req.body.host || req.body.host == '') {
      errors.push('Host is required');
    } else {
      var valid_ip_address = "^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$";
      var valid_hostname = "^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$";
      if(!req.body.host.match(valid_ip_address) && !req.body.host.match(valid_hostname)) 
        errors.push('Invalid host');
    }

    req.body.port = Number(req.body.port);
    if(req.body.port <= 0 || req.body.port > 65535)
      errors.push('Invalid port');
    
    if(req.body.protocol != 'http' && req.body.protocol != 'https') 
      errors.push('Invalid protocol');

    if(req.body.requests == '')
      errors.push('You must start with at least one requests to send to the server');

    if(errors.length) {
      console.log('/test/new errors: '+JSON.stringify(errors));
      res.render('dashboard', _.extend(logged_in(req), {
        account: req.account,
        errors: errors,
        test_host: req.body.host,
        test_port: req.body.port,
        test_protocol: req.body.protocol,
        test_requests: req.body.requests
      }));
      return;
    }

    // make the paths
    var paths = req.body.requests.split('\r\n');
    var requests = [];
    for(var i in paths) {
      var path = paths[i];
      if(path.substring(0, 1) != '/')
        path = '/'+path;
      requests.push({ method:'GET', path:path, body:'' });
    }
    var test = {
      host : req.body.host,
      port : req.body.port,
      protocol : req.body.protocol,
      verified : false,
      requests : JSON.stringify(requests),
      results : '',
      running : false,
      yeti : ''
    };
    req.account.tests.push(test);
    req.account.save(function(err){
      if(err) {
        console.log('error saving account: '+err);
      } else {
        res.redirect('/dashboard');
      }
    });
  });

  app.get('/test/run/:id',function(req,res){
    if(!force_authentication(req, res)) return;
    var test = req.account.tests.id(req.params.id);
    console.log(test);
    if(!test.verified) {
      res.render('dashboard');
      return;
    }
    res.render('test_run',_.extend(logged_in(req),{test : test})); 
  });

  app.get('/test/data/:id',function(req, res){
    if(!force_authentication(req, res)) return;
    var test = req.account.tests.id(req.params.id);
    if(!test.verified){
      res.send('permission denied');
      return;
    }/*
    if(!test.running){
      console.log('test not running');
      send_responses(test.results, {status:"finished"}, res);
      return;
    }*/
    yeti_id = test.yeti;
    var report_options = get_req_options();
    report_options.path = '/report/' + yeti_id;
    var report_data_buffer = '';
    var status_options = get_req_options();
    status_options.path = '/status/' + yeti_id;
    var status_data_buffer = '';

    report_responded = false;
    status_responded = false;
    report = http.get(report_options, function(report_res){
      report_res.on('data', function(data){
        report_data_buffer += data;
      });
      report_res.on('end', function(){
        report_responded = true;
        if(status_responded == true){
          console.log('test running');
          send_responses(report_data_buffer, status_data_buffer, res);
        }
      });
    }).on('error', function(e){
      res.send('Error: '+e.message);
    });
    status = http.get(status_options, function(status_res){
      status_res.on('data', function(data){
        status_data_buffer += data;
      });
      status_res.on('end', function(){
        status_responded = true;
        if(report_responded == true){
          console.log('test running');
          send_responses(report_data_buffer, status_data_buffer, res);
        }
      });
    }).on('error', function(e){
      res.send('Error: '+e.message);
    });

  });
  function send_responses(report_data, status_data, res){
    console.log('Report Data: ');
    console.log(report_data);
    try{
      res.send({report: JSON.parse(report_data), status: JSON.parse(status_data)});
    } catch(err){
      console.log(err);
      res.send({report:{},status:{}});
    }
  }

  app.get('/test/report/:id', function(req, res){
    if(!force_authentication(req, res)) return;
    res.render('test_report',_.extend(logged_in(req),{id: req.params.id})); 
  });

  app.post('/test/run', function(req, res){
    if(!force_authentication(req, res)) return;

    if(req.body.submit == "Run away!") {
      res.redirect('/dashboard');
      return;
    }

    var test = req.account.tests.id(req.body.test_id);
    var requests = JSON.parse(test.requests);
    if(!test.verified) {
      res.redirect('/dashboard');
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
      account_id: req.account._id,
      test_id: test._id
    };

    payload = JSON.stringify(payload); 
    console.log(payload);
    var create_options = get_req_options();
    create_options.path = "/create";
    create_options.method = "POST";
    var create = http.request(create_options,function(create_res){
      var data_buffer = '';
      create_res.on('data', function(data){
        data_buffer += data;
      });
      create_res.on('end', function(){
        var yeti = JSON.parse(data_buffer);
        test.yeti=yeti.yeti_id;
        console.log(test);
        req.account.save(function(err){
          if(err) {
            console.log(err.message) ;
          }else{
            console.log('Saved yeti');
          }
        });
        setTimeout(function(){
          set_options = get_req_options();
          set_options.path = "/set/" + yeti.yeti_id;
          set_options.method = "POST";
          set_options.headers = {"Content-Type" : "application/json"};
          var set = http.request(set_options, function(set_res){
            console.log('set begin');
            var data_buffer = '';
            set_res.on('data', function(data){
              data_buffer += data;
            });
            set_res.on('end', function(){
              start_options = get_req_options();
              start_options.path = "/start/" + yeti.yeti_id;
              start_options.method = "POST";
              var start = http.request(start_options, function(start_res){
                var data_buffer = '';
                start_res.on('data', function(data){
                  data_buffer += data;
                });
                start_res.on('end', function(){
                  test.running = true;
                  test.save(function(){
                    res.redirect('/test/report/' + test._id);
                  });
                });
              });
              start.end();
            });
          });
          set.end(payload);
        },5000);
      });
    });
    create.end();
/*


    }
    var queue = http.request(
      req_options, 
      function(set_res){
        set_res.on('end', function(){
          console.log('ok it was set');
          var start = http.request( { host: "127.0.0.1", port : 31337, method : 'POST', path : '/start', });
          start.end();
        });
      }
    ); 
    queue.write(payload);
    queue.end();*/
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

  app.get('/test/delete/:id', function(req,res){
    if(!force_authentication(req, res)) return;
    var test = req.account.tests.id(req.params.id);
    var requests = [];
    if(test.requests)
      requests = JSON.parse(test.requests);
    res.render('test_delete', _.extend(logged_in(req), { test:test, requests:requests }));
  }); 

  app.post('/test/delete/:id', function(req,res){
    if(!force_authentication(req, res)) return;

    if(req.body.submit == 'Oops, I want to keep it') {
      res.redirect('/dashboard');
      return;
    }

    var test = req.account.tests.id(req.params.id);
    test.remove();
    req.account.save(function(err){
      res.redirect('/dashboard');
    });
  });

  app.get('/test/paths/:id', function(req,res){
    if(!force_authentication(req, res)) return;
    var test = req.account.tests.id(req.params.id);
    res.render('test_paths', _.extend(logged_in(req), { test:test }));
  }); 

  app.post('/test/paths/:id', function(req,res){
    if(!force_authentication(req, res)) return;

    if(req.body.submit == "Cancel, don't save paths") {
      console.log('cancel, dont save paths');
      res.redirect('/dashboard');
      return;
    }
    
    var test = req.account.tests.id(req.params.id);
    var errors = [];
    try {
      JSON.parse(req.body.requests);
    } catch(e) {
      errors.push('Ack, the data is in a bad format');
      res.render('test_paths', _.extend(logged_in(req), { errors:errors, test:test }));
      return;
    }

    test.requests = req.body.requests;
    req.account.save(function(err){
      if(req.body.submit == "Save changes and keep editing") {
        console.log('save changes and keep editing');
        res.render('test_paths', _.extend(logged_in(req), { test:test }));
      } else {
        console.log('save changes and go back to dashboard');
        res.redirect('/dashboard');
      }
    });
  });
};
