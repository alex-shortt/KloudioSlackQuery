var express = require('express');
var app = express();
var request = require('request');
var http = require('http');
var querystring = require('querystring');

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function (request, response) {
    response.render('pages/index');
});

app.get('/getParams', function (req, res) {
    var query = require('url').parse(req.url, true).query;

    var text = query.text;
    console.log(text);
});

app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});