var spawn = require('child_process').spawn;

function log(prefix, data) {
  data = ''+data; // make sure it's a string
  data = data.replace(/\n$/, ''); // remove trailing \n
  console.log(prefix+': '+data);
}

// spawn the UI
var ui = spawn(process.argv[0], ['server.js'], { cwd: __dirname + '/ui/' });
ui.stdout.on('data', function(data){ log('UI stdout', data); });
ui.stderr.on('data', function(data){ log('UI stderr', data); });
ui.on('exit', function(code){ console.log('UI exited with code '+code); });
console.log('UI has been spawned');

// spawn the MC
var mc = spawn(process.argv[0], ['server.js'], { cwd: __dirname + '/mc/'});
mc.stdout.on('data', function(data){ log('MC stdout', data); });
mc.stderr.on('data', function(data){ log('MC stderr', data); });
mc.on('exit', function(code){ console.log('MC exited with code '+code); });
console.log('MC has been spawned');
