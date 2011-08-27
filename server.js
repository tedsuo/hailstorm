var http = require('http');
var nko = require('nko')('sOlBQnEkup4F/fL4');

var app = http.createServer(function (req, res) {
res.writeHead(200, { 'Content-Type': 'text/html' });
res.end('\
<pre>\
 __  __     ______     __     __         ______     ______   ______     ______     __    __   \n \
/\ \_\ \   /\  __ \   /\ \   /\ \       /\  ___\   /\__  _\ /\  __ \   /\  == \   /\ "-./  \   \n\
\ \  __ \  \ \  __ \  \ \ \  \ \ \____  \ \___  \  \/_/\ \/ \ \ \/\ \  \ \  __<   \ \ \-./\ \  \n\
 \ \_\ \_\  \ \_\ \_\  \ \_\  \ \_____\  \/\_____\    \ \_\  \ \_____\  \ \_\ \_\  \ \_\ \ \_\ \n\
  \/_/\/_/   \/_/\/_/   \/_/   \/_____/   \/_____/     \/_/   \/_____/   \/_/ /_/   \/_/  \/_/ \n\
</pre>\
');
});

app.listen(parseInt(process.env.PORT) || 7777);
console.log('Listening on ' + app.address().port);
