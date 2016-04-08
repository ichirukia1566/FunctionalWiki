var express = require('express');
var fs = require('fs');
var parser = require('./parser');
var generators = require('./generators');

var app = express();

app.get(
    "/"
    , function (req, res) {
        res.redirect('/Main Page');
    }
);

app.get(
    "*"
    , function (req, res) {
        var title = unescape(req.path).replace(/^\//, '');
        try {
            var text = fs.readFileSync('articles/' + title, 'utf8');
            try {
                result = parser.parse(text, {title : title}).evaluate(Object.create(null));
                res.set('Content-Type', 'text/plain; encoding=utf-8');
                res.send(generators.plain_text(result.value));
            } catch (e) {
                console.log(e);
                res.status(500);
                res.set('Content-Type', 'text/plain; encoding=utf-8');
                res.send(e.toString());
            }
        } catch (err) {
            console.log(err);
            res.status(404);
            res.sendFile('404.html', {root : __dirname});
        }
    }
);
        

app.listen(
    8888
    , function () {
        console.log("App started");
    }
);
