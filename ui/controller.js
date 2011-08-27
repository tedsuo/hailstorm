exports.routes = function(app){

  app.get('/',function(req,res){
    res.render('index',res.params);
  });

/*  app.get('/signup',function(req,res){
    res.render('signup');
  });

  app.post('/signup',function(req,res){
    res.render('signup');
  });

  app.get('/login',function(req,res){
    res.render('login');
  }); */
};
