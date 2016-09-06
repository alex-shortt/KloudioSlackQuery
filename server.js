var express = require('express'); // Express web server framework
var request = require('request');
var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var app = express();

app.use(express.static(__dirname + '/client'))
    .use(cookieParser());

app.get('/searchTrack', function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'http://www.alexshortt.com');
    res.setHeader('Access-Control-Allow-Origin', 'www.alexshortt.com');

    var query = require('url').parse(req.url, true).query;

    var response_url = query.response_url;
    var token = query.token;
    var text = query.text;

    console.log(query.text);

    res.send(JSON.stringify({
        text: "Could not find track. Please refine your search."
    }, null, 3));
});

app.get('/getParams', function (req, res) {
    var query = require('url').parse(req.url, true).query;
    var text = query.text;
    
    console.log(text);
    
});

fs.readFile('client/index.html', function (err, html) {
    if (err) {
        throw err; 
    }       
    http.createServer(function(request, response) {  
        response.writeHeader(200, {"Content-Type": "text/html"});  
        response.write(html);  
        response.end();  
    }).listen(8000);
});

console.log('Listening on 8000');
app.listen(8000);