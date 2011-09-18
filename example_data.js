module.exports = test_data = {
  defaults:{
    protocol: 'http',
    host: 'target-site.com',
    port: 80
  },
  requests:[
    {method:'get', path:'/test', weight:200},
    {method:'post', path:'/foo', body:'bar=false', weight:5},
    {method:'post', path:'/bar', body:'foo=true', weight:10},
    {method:'get', path:'/test', weight:30}
  ],
  clients:[
    {
      path: '/game', 
      weight:30, 
      function(err, browser, status){
        browser
        .fill("email", "zombie@underworld.dead").
        .fill("password", "eat-the-living").
        .pressButton("Sign Me Up!", function(err, browser, status){});
      }
    }
  ]
};


