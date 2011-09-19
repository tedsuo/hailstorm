var spawn = require('child_process').spawn;

var run_test = function(test_path){
  var test = spawn('node',[test_path]);
  test.stdout.pipe(process.stdout);
  test.stderr.pipe(process.stderr);
  test.on('exit',function(){
//    console.log(test_path+' exiting');
  });
};

run_test(__dirname+'/basic_load_test.js');
run_test(__dirname+'/mc_client_chain_commands.js');