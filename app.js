var express = require('express');
var bodyParser = require('body-parser')
var path = require('path');
var nforce = require('nforce');
var hbs = require('hbs');
var org;


var app = express();
// parse json data from post
app.use(bodyParser.json());

app.set('view engine', 'hbs');
app.enable('trust proxy');
// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));

function isSetup() {
  return (process.env.CONSUMER_KEY != null) && (process.env.CONSUMER_SECRET != null);
}

function oauthCallbackUrl(req) {
  return req.protocol + '://' + req.get('host');
}

hbs.registerHelper('get', function (field) {
  return this.get(field);
});

//****************************************************
// After creating in Salesforce a connected App :
// https://help.salesforce.com/articleView?id=connected_app_create.htm&type=5
// 
// specify ClienID & Client Secret in this variable : CONSUMER_KEY & CONSUMER_SECRET
// *****************************************************
app.get('/', function (req, res) {
  if (isSetup()) {
    org = nforce.createConnection({
      clientId: process.env.CONSUMER_KEY,
      clientSecret: process.env.CONSUMER_SECRET,
      redirectUri: oauthCallbackUrl(req),
      mode: 'single',
      apiVersion: 'v40.0'
    });

    console.log('------------');
    console.log(req.query.code);
    if (req.query.code !== undefined) {
      // authenticated
      org.authenticate(req.query, function (err) {
        if (!err) {
          //Validate authentification
          org.query({ query: 'SELECT id, name FROM Account' }, function (err, results) {
            if (!err) {
              //Show first page of the application after authentification
              res.render('layout3');
            }
            else {
              res.send(err.message);
            }
          });
        }
        else {
          if (err.message.indexOf('invalid_grant') >= 0) {
            res.redirect('/');
          }
          else {
            res.send(err.message);
          }
        }
      });
    }
    else {
      res.redirect(org.getAuthUri());
    }
  }
  else {
    res.redirect('/setup');
  }
});


app.post('/simulation', function (req, res) {
  console.log('In simulation function ....' + req);
  console.log('JSON structure:');
  console.log(req.body);
  // ****************************************************************************
  // Sending Event (throw REST API) to Salesforce
  // ***************************************************************************
  /* sample event weather event .....
    {
  "DeviceID__c":"1234",
  "door__c":"trasmediterranea",
  "humidity__c":"12",
  "key__c":"trasmediterranea",
  "temperature__c":"32.445",
  "ts__c":"trasmediterranea"
  }
  */
  // insert json inside req.body to event 'trans__e' or AIS_Event__e (Api name of Event)
  var evt = nforce.createSObject('AIS_Event__e', req.body);
  org.insert({ sobject: evt }, function (err, resp) {
    if (!err) {
      res.json({ success: "Event sent successfully", status: 200 });
    }
    else {
      res.send(err.message);
    }
  });
});

// ************ Render setup page *******************************
app.get('/setup', function (req, res) {
  console.log('In setup ........isSetup()=' + isSetup());
  if (isSetup()) {
    res.redirect('/');
  }
  else {
    var isLocal = (req.hostname.indexOf('localhost') == 0);
    var herokuApp = null;
    if (req.hostname.indexOf('.herokuapp.com') > 0) {
      herokuApp = req.hostname.replace(".herokuapp.com", "");
    }
    console.log('Render SETUP .......');
    res.render('setup', { isLocal: isLocal, oauthCallbackUrl: oauthCallbackUrl(req), herokuApp: herokuApp });
  }
});

app.listen(process.env.PORT || 5000);