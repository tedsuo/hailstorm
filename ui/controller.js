var model = require('./model');
exports.routes = function(app){
  app.get('/',function(req,res){
    res.render('index',res.params);
  });

  app.get('/dashboard', function(req,res){
    if(!req.session.account) {
      account = model.Account.findOne({}, function(err, account){
        res.render('dashboard',{ account : account});
      });
      //res.render('login', { errors: ['you must first log in']});
    } else  {
      res.render('dashboard',{ account : req.account});
    }
  });

  app.get('/register',function(req,res){
    res.render('register');
  });

  app.post('/register',function(req,res){
    function render_errors(errors) {
      var params = { 
        username: req.body.username,
        password: req.body.password,
        errors: errors
      };
      console.log(params);
      res.render('register', params);
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
              req.session.account = account;
              res.redirect('/dashboard');
            }
          });
        }
      }
    });
  });

  app.get('/login',function(req,res){
    res.render('login');
  }); 
  
  app.post('/login',function(req,res){
    res.render('login');
  }); 
  
  app.get('/about',function(req,res){
    res.render('about');
  }); 

  app.post('/test/new',function(req,res){
    console.log(req.body.url);
    console.log(req.body.requests);
    req.flash('info', 'test created');
    res.redirect('/dashboard');
  });
};
