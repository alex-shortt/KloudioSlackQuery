var express = require('express'); // Express web server framework
var request = require('request');
var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '62c4c88178d448069708163bf58d2a47';
var client_secret = 'db0b2f0e77dd4053be8a7b0add33d691';
var redirect_uri = 'https://spotify-song-request-alex-shortt.c9users.io/';

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/client'))
  .use(cookieParser());

app.get('/searchTrack', function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://www.alexshortt.com');
  res.setHeader('Access-Control-Allow-Origin', 'www.alexshortt.com');
    
  res.send(JSON.stringify({
      text: "hello"
  }, null, 3));
    return;
  var query = require('url').parse(req.url, true).query;

  var response_url = query.response_url;
  var token = query.token;
  var text = query.text;

  console.log(query.text);

  request("https://api.spotify.com/v1/search?q=" + text + "&type=track&limit=1", function(error, response, body) {
    //console.log("https://api.spotify.com/v1/search?q=" + query.text + "&type=track&limit=1");
    var obj = JSON.parse(body);

    if (obj.tracks.next == null || obj.tracks.items[0] == null) {
      console.log("nulllllll");
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        text: "Could not find track. Please refine your search."
      }, null, 3));
      return;
    }

    var artist = obj.tracks.items[0].artists[0].name;
    var title = obj.tracks.items[0].name;
    var preview_url = obj.tracks.items[0].preview_url;
    var album_cover = obj.tracks.items[0].album.images[0].url;
    var external_url = obj.tracks.items[0].external_urls.spotify;

    console.log(artist + " - " + title);

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      text: "*<" + external_url + "|" + artist + " - " + title + ">* "
    }, null, 3));
  });
});

console.log('Listening on 8080');
app.listen(8080);
