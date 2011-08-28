var express = require('express');
var mongoose = require('mongoose');
var controller = require('./controller');
var model = require('./model');
var everyauth = require('everyauth');
// Step 1 code goes here
everyauth.password
  .loginFormFieldName('username')
  .getLoginPath('/login') // Uri path to the login page
  .postLoginPath('/login') // Uri path that your login form POSTs to
  .loginView('login')
  .authenticate( function (username, password) {
    // Either, we return a user or an array of errors if doing sync auth.
    model.find_user_by_login_and_password(username, password, function(err, user){
      if(err && err.length > 0){
        return err;
      }
      return user;
    });
  })
  .loginSuccessRedirect('/') // Where to redirect to after a login

    // If login fails, we render the errors via the login view template,
    // so just make sure your loginView() template incorporates an `errors` local.
    // See './example/views/login.jade'

  .getRegisterPath('/register') // Uri path to the registration page
  .postRegisterPath('/register') // The Uri path that your registration form POSTs to
  .registerView('register')
  .validateRegistration( function (user) {
    // Validate the registration input
    // Return undefined, null, or [] if validation succeeds
    // Return an array of error messages (or Promise promising this array)
    // if validation fails
    //
    // e.g., assuming you define validate with the following signature
    // var errors = validate(login, password, extraParams);
    // return errors;
    //
    // The `errors` you return show up as an `errors` local in your jade template
    return null;
    console.log('validateRegistration '+JSON.stringify(user));
    var promise = this.Promise();
    model.does_username_exist(user.username, function(err, exists){
      var ret;
      if(exists) {
        ret = ['That username is already taken! Either log in or try another username'];
      } else {
        ret = null;
      }
      promise.fulfill(ret);
    });
    return promise;
  })
  .registerUser( function (user) {
    var promise = this.Promise();
    console.log(user);
    model.create_account(user.username, user.password, function(err, user){
      if(err && err.length > 0){
        console.log('error in reg');
        promise.fulfill(err);
        return;
      }
      promise.fulfill(user);
    });
    return promise;
    // This step is only executed if we pass the validateRegistration step without
    // any errors.
    //
    // Returns a user (or a Promise that promises a user) after adding it to
    // some user store.
    //
    // As an edge case, sometimes your database may make you aware of violation
    // of the unique login index, so if this error is sent back in an async
    // callback, then you can just return that error as a single element array
    // containing just that error message, and everyauth will automatically handle
    // that as a failed registration. Again, you will have access to this error via
    // the `errors` local in your register view jade template.
    // e.g.,
    // var promise = this.Promise();
    // User.create(newUserAttributes, function (err, user) {
    //   if (err) return promise.fulfill([err]);
    //   promise.fulfill(user);
    // });
    // return promise;
    //
    // Note: Index and db-driven validations are the only validations that occur 
    // here; all other validations occur in the `validateRegistration` step documented above.
  })
  .registerSuccessRedirect('/'); // Where to redirect to after a successful registrationi

/*var account = new model.Account({ username:'test', password:'test'});
account.save(function(err){
  if(err) console.log(err);
  else console.log('success!');
});*/

if(process.env.NODE_ENV == 'production'){
  port = 80;
} else {
  port = 9003;
}

var app = express.createServer(
  express.static(__dirname + '/public'),
  express.cookieParser(),
  express.bodyParser(),
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
