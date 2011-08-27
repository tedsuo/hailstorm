var nko = require('nko')('sOlBQnEkup4F/fL4');
var spawn = require('child_process').spawn;

// spawn the UI
var ui = spawn('node', ['server.js'], { cwd:'./ui/' });
ui.stdout.on('data', function(data){ console.log('UI stdout: '+data); });
ui.stderr.on('data', function(data){ console.log('UI stderr: '+data); });
ui.on('exit', function(code){ console.log('UI exited with code '+code); });
console.log('UI has been spawned');

