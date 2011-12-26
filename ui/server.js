var express = require('express');
var controller = require('./controller');
var session = require('./session');
var mc = require('../mc/client');
var dnode = require('dnode');

var mc_dnode_port = parseInt(process.env.MC_HTTP_PORT) || 31337;
var mc_client = mc.createClient(mc_dnode_port);

if(process.env.NODE_ENV == 'production'){
  port = 80;
} else {
  port = 9003;
}

var app = express.createServer(
  express.static(__dirname + '/public'),
  express.logger({ format: ':method :url' }),
  express.cookieParser(),
  express.bodyParser(),
  express.session({ secret: "magicpants" }),
  session.load_account()
);

app.set('view engine', 'ejs');
app.set('view options', {
    open: '{{',
    close: '}}'
});

controller.routes(app, mc_client);

app.listen(port);
console.log('listening on '+port);

var browser_server = dnode(function(client, conn){
  console.log('browser connected: '+conn.id);
  this.report = function(test_id, test_run_id, cb){
    if(!force_authentication(req, res)) return;
    var test = req.account.tests.id(test_id);
    if(!test.verified || !test.test_runs.id(test_run_id)){
      cb('permission denied');
      return;
    }
    
    yeti_id = test.yeti;

    async.parallel({
      report: function(callback){
        mc_client.report(test_run_id, function(err, report_res){
          // Necessary due to dnode bug to stringify objects
          report_res = JSON.parse(report_res);
          if(err){
            callback(err);
          } else {
            callback(null, report_res);
          }
        });
      },
      status: function(callback){
        mc_client.status(yeti_id, function(err, status_res){
          if(err){
            callback(err);
          } else {
            callback(null, status_res);
          }
        });
      }
    }, function(err, results){
      if(err){
        handle_error(res, err);
      } else {
        console.log("sending some results");
        cb(null, results);
      }
    });

  }
}).listen(app);

