exports.attach_to_req = function(){
  return function(req,res,next){
    //console.log(req.session);
    next();
  };
};


