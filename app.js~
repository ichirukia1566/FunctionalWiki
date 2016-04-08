var express = require('express');
var fs = require('fs');
var app = express();

app.get(
    "/*"
    , function (req, res) {
        var title = req.path.replace(/^\//, '');
        fs.readFile(
            title
            , 'utf8'
            , function (err, data) {
                if (err) {
                    console.log(err);
                    res.sendStatus(404);
                    res.sendFile(404.html, {root : __dirname});
                } else {
                    try {
                        var result = render(data, plain_text_generator);
                        res.send(result);
                    } catch (e) {
                        res.sendStatus(500);
                        res.send(e);
                    }
                }
            }
        );
    }
);
        

app.listen(
    8080
    , function () {
        console.log("App started");
    }
);
