var spawn = require('child_process').spawn;

function log(prefix, data) {
  data = ''+data; // make sure it's a string
  data = data.replace(/\n$/, ''); // remove trailing \n
  console.log(prefix+': '+data);
}

// should we load cloud server?
if(process.env.CLOUD_SERVER == 'true') {

  // spawn the cloud server
  var ui = spawn('node', ['cloud_server.js'], { cwd: __dirname + '/yeti/' });
  ui.stdout.on('data', function(data){ log('cloud_server stdout', data); });
  ui.stderr.on('data', function(data){ log('cloud_server stderr', data); });
  ui.on('exit', function(code){ console.log('cloud_server exited with code '+code); });
  console.log('cloud_server has been spawned');

} else {

  var nko = require('nko')('sOlBQnEkup4F/fL4');
  var node4 = '/opt/node-0.4.11/bin/node';
  var node5 = '/opt/node-0.5.5/bin/node';

  // spawn the UI
  var ui = spawn(node4, ['server.js'], { cwd: __dirname + '/ui/' });
  ui.stdout.on('data', function(data){ log('UI stdout', data); });
  ui.stderr.on('data', function(data){ log('UI stderr', data); });
  ui.on('exit', function(code){ console.log('UI exited with code '+code); });
  console.log('UI has been spawned');

  // spawn the MC
  var mc = spawn(node4, ['mc.js'], { cwd: __dirname });
  mc.stdout.on('data', function(data){ log('MC stdout', data); });
  mc.stderr.on('data', function(data){ log('MC stderr', data); });
  mc.on('exit', function(code){ console.log('MC exited with code '+code); });
  console.log('MC has been spawned');

  // spawn the cloud server
  var ui = spawn(node5, ['cloud_server.js'], { cwd: __dirname + '/yeti/' });
  ui.stdout.on('data', function(data){ log('cloud_server stdout', data); });
  ui.stderr.on('data', function(data){ log('cloud_server stderr', data); });
  ui.on('exit', function(code){ console.log('cloud_server exited with code '+code); });
  console.log('cloud_server has been spawned');
}
