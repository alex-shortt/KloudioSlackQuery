var express = require('express');
var request = require('request');
var http = require('http');
var AWS = require('aws-sdk');
var mysql = require('mysql');
var Excel = require('exceljs');
var fs = require('fs');
var uuid = require('node-uuid');
var app = express();
var bodyParser = require('body-parser');

var dummy_key = process.env.DUMMY_DATABASE_KEY;

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function (request, response) {
    response.render('pages/index');
});

app.get('/amazon', function (req, res) {
    fs.readFile(__dirname + "/excel/output.xlsx", function (err, data) {
        if (err) {
            throw err;
        }
        var s3 = new AWS.S3();
        s3.putObject({
            Bucket: 'kloudio-slack-files',
            Key: 'output.xlsx',
            Body: data,
            ACL: 'public-read'
        }, function (res) {
            console.log('Successfully uploaded file.');
        })

    });
});

app.get('/authCallback', function (req, res) {
    var query = require('url').parse(req.url, true).query;
    console.log("Code: " + query.code);
    console.log("State: " + query.state);

    request('https://slack.com/api/oauth.access?client_id=7412967968.87339409396&client_secret=cc05ac09f0b7ad3907eec3164112aa68&redirect_uri=https://sheltered-castle-93752.herokuapp.com/authCallback&code=' + query.code, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            //call Kloudio api to store user with bot tokens and pretty much all this info
            //store user as userid-teamid, since userid repeats
            var act_body = JSON.parse(body);
            console.log("Team ID: " + act_body.team_id);
            console.log("User ID: " + act_body.user_id);
            console.log("Access Token: " + act_body.access_token);
            console.log("Bot User ID: " + act_body.bot.bot_user_id);
            console.log("Bot Access Token; " + act_body.bot.bot_access_token);
            
        }
    });
});

app.get('/getReport', function (req, res) {
    var query = require('url').parse(req.url, true).query;
    var response_url = query.response_url;
    console.log(query);
    var token = query.token;
    var from = query.text.split(" ")[0];
    var column = query.text.split(" ")[1];
    var final_name = from + "_" + uuid.v1() + ".xlsx";
    var final_path = __dirname + "/excel/" + final_name;
    res.setHeader('Content-Type', 'application/json');

    var connection = mysql.createConnection({
        host: 'mysql.cevf9obrdvku.us-west-2.rds.amazonaws.com',
        user: 'admin',
        password: dummy_key,
        database: 'MYSQL_DEV'
    });

    connection.connect();

    connection.query({
        sql: 'SELECT ' + column + ' FROM ' + from
    }, function (error, rows) {
        if (!error) {
            //setup workbook
            var columns = objectToPaths(rows);
            var finalText = "";
            var workbook = new Excel.Workbook();

            workbook
                .xlsx
                .readFile('excel/template.xlsx')
                .then(function () {
                    var worksheet = workbook.getWorksheet("Sheet1");

                    //set headers in file and bold them
                    for (var col = 0; col < columns.length / rows.length; col++) {
                        worksheet.getCell(numToExcelLetters(col + 1) + '1').value = columns[col].split('.')[1];
                        worksheet.getCell(numToExcelLetters(col + 1) + '1').font = {
                            bold: true
                        };
                    }

                    //set data in file
                    for (var col = 0; col < columns.length / rows.length; col++) {
                        for (var row = 0; row < rows.length; row++) {
                            worksheet.getCell(numToExcelLetters(col + 1) + '' + (row + 2)).value = rows[row][columns[col].split('.')[1]];
                        }
                    }
                })
                .then(function () {
                    return workbook.xlsx.writeFile('excel/' + final_name);
                })
                .then(function () {
                    //upload to s3, delete local file
                    fs.readFile(final_path, function (err, data) {
                        if (err) {
                            console.log("Error while reading file: " + err);
                            res.send(JSON.stringify({
                                text: "Error while reading file: " + err
                            }, null, 3));
                        }
                        var s3 = new AWS.S3();
                        s3.putObject({
                            Bucket: 'kloudio-slack-files',
                            Key: final_name,
                            Body: data,
                            ACL: 'public-read'
                        }, function (res) {
                            console.log('Successfully uploaded file ' + final_path);
                        })

                    });
                    fs.unlink(final_path);

                    //return the link
                    finalText = "https://s3-us-west-2.amazonaws.com/kloudio-slack-files/" + final_name;
                    res.send(JSON.stringify({
                        text: "<" + finalText + "| Click to Download `" + (column == "*" ? "all columns" : column) + "` in `" + from + "`>",
                        response_type: "in_channel"
                    }, null, 3));
                });

        } else {
            console.log('Error while performing Query.\n ' + error);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
                text: 'Error while performing Query:' + error
            }, null, 3));
        }
    });
    connection.end();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.post('/getPostReport', function (req, res) {
    //kall kloudio services to retrieve following info based on user id and team name
    var token = 'xoxb-94350855280-p2bDTgGtSY12jiCpe9mLg05S';
    var channel = req.body.channel_id;
    var text = "TEST !@#123";
    var as_user = "false";
    
    var url = 'https://slack.com/api/chat.postMessage?token=' + token + '&channel=' + channel + '&text=' + text + '&as_user=' + as_user;
    request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    });
});

function numToExcelLetters(columnNumber) {
    var dividend = columnNumber;
    var columnName = "";
    var modulo;

    while (dividend > 0) {
        modulo = (dividend - 1) % 26;
        columnName = String.fromCharCode(65 + modulo) + columnName;
        dividend = Math.floor((dividend - modulo) / 26);
    }

    return columnName;
}

function objectToPaths(data) {
    var validId = /^[a-z_$][a-z0-9_$]*$/i;
    var result = [];
    doIt(data, "");
    return result;

    function doIt(data, s) {
        if (data && typeof data === "object") {
            if (Array.isArray(data)) {
                for (var i = 0; i < data.length; i++) {
                    doIt(data[i], s + "[" + i + "]");
                }
            } else {
                for (var p in data) {
                    if (validId.test(p)) {
                        doIt(data[p], s + "." + p);
                    } else {
                        doIt(data[p], s + "[\"" + p + "\"]");
                    }
                }
            }
        } else {
            result.push(s);
        }
    }
}

app.listen(app.get('port'), function () {
    console.log('Node app is running on port', app.get('port'));
});