exports.routes = function(app){
  app.get('/',function(req,res){
    res.render('index',res.params);
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
