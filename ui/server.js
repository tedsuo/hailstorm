var express = require('express');
var controller = require('./controller');
var model = require('./model');
var everyauth = require('everyauth');
// Step 1 code goes here

everyauth.google
  .appId('YOUR CLIENT ID HERE')
  .appSecret('YOUR CLIENT SECRET HERE')
  .scope('https://www.google.com/m8/feeds') // What you want access to
  .handleAuthCallbackError( function (req, res) {
    // If a user denies your app, Google will redirect the user to
    // /auth/facebook/callback?error=access_denied
    // This configurable route handler defines how you want to respond to
    // that.
    // If you do not configure this, everyauth renders a default fallback
    // view notifying the user that their authentication failed and why.
  })
  .findOrCreateUser( function (session, accessToken, accessTokenExtra, googleUserMetadata) {
    // find or create user logic goes here
    // Return a user or Promise that promises a user
    // Promises are created via
    //     var promise = this.Promise();
  })
  .redirectPath('/');

if(process.env.NODE_ENV == 'production'){
  port = 80;
} else {
  port = 9003;
}

var app = express.createServer(
  express.static(__dirname + '/public'),
  express.cookieParser(),
  express.session({ secret: "magicpants" }),
  everyauth.middleware(),
  model.setUser()
);

everyauth.helpExpress(app);
app.set('view engine', 'ejs');

app.set('view options', {
    open: '{{',
    close: '}}'
});

controller.routes(app);

app.listen(port);
console.log('listening on '+port);
