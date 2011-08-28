var mongoose = require('mongoose');
var model = require('./model');
exports.routes = function(app){
  app.get('/',function(req,res){
    res.render('index',res.params);
  });

  app.get('/dashboard', function(req,res){
    if(!req.account) {
      req.account = 
      res.render('dashboard',{ account : req.account});
      //res.render('login', { errors: ['you must first log in']});
    } else  {
      res.render('dashboard',{ account : req.account});
    }
  });

  app.get('/register',function(req,res){
    res.render('register');
  });

  app.post('/register',function(req,res){
    res.render('register');
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
};
