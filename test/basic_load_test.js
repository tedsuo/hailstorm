// Assumes both yeti and hailstorm are running and connected

var http = require('http');
var mc = require('../mc/client');
var util = require('util');
var assert = require('assert');

mc_client = mc.createClient();
console.log(util.inspect(mc_client));
