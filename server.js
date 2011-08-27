var http = require('http');
var nko = require('nko')('sOlBQnEkup4F/fL4');

var app = http.createServer(function (req, res) {
res.writeHead(200, { 'Content-Type': 'text/html' });
res.end('\
<pre>\
 __  __     ______     __     __         ______     ______   ______     ______     __    __    \
/\ \_\ \   /\  __ \   /\ \   /\ \       /\  ___\   /\__  _\ /\  __ \   /\  == \   /\ "-./  \   \
\ \  __ \  \ \  __ \  \ \ \  \ \ \____  \ \___  \  \/_/\ \/ \ \ \/\ \  \ \  __<   \ \ \-./\ \  \
 \ \_\ \_\  \ \_\ \_\  \ \_\  \ \_____\  \/\_____\    \ \_\  \ \_____\  \ \_\ \_\  \ \_\ \ \_\ \
  \/_/\/_/   \/_/\/_/   \/_/   \/_____/   \/_____/     \/_/   \/_____/   \/_/ /_/   \/_/  \/_/ \
</pre>\
');
});

app.listen(parseInt(process.env.PORT) || 7777);
console.log('Listening on ' + app.address().port);
