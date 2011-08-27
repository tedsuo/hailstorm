var nko = require('nko')('sOlBQnEkup4F/fL4');
var spawn = require('child_process').spawn;

// spawn the UI
var ui = spawn('node', ['server.js'], { cwd:'./ui/' });
ui.stdout.on('data', function(data){ console.log('UI stdout: '+data); });
ui.stderr.on('data', function(data){ console.log('UI stderr: '+data); });
ui.on('exit', function(code){ console.log('UI exited with code '+code); });
console.log('UI has been spawned');

/*// spawn the MC
var mc = spawn('node', ['mc.js'], { cwd:'./' });
mc.stdout.on('data', function(data){ console.log('MC stdout: '+data); });
mc.stderr.on('data', function(data){ console.log('MC stderr: '+data); });
mc.on('exit', function(code){ console.log('MC exited with code '+code); });
console.log('MC has been spawned');
*/
