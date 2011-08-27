exports.setUser = function(){
  return function(req,res,next){
    res.params = {user:'Somebody'};
    next();
  };
};


