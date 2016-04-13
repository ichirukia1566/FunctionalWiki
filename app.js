var express = require('express');
var fs = require('fs');
var parser = require('./parser');
var generators = require('./generators');
var bodyParser = require('body-parser');

var app = express();

app.use("/css", express.static(__dirname + '/css'));
app.use("/images", express.static(__dirname + '/images'));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

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
            if (title === "create") {
                res.sendFile(__dirname + "/create.html");
            } else {
                var text = fs.readFileSync('articles/' + title, 'utf8');
                var html_head = "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\">\n<head>\n<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />\n<title>" + title + "</title>\n<link rel=\"stylesheet\" type=\"text/css\" href=\"/css/styles.css\">\n<script src=\"https://ajax.googleapis.com/ajax/libs/jquery/2.2.2/jquery.min.js\"></script>\n<script>$(document).ready(function alignColumns() {var height_c = $(\"#content\").height();if (height_c > 160) {$(\"#sidebar\").height(height_c);}});</script>\n</head>\n<body>\n<section class=\"container\">\n<div id=\"sidebar\" class=\"sidebar1\">\n<div class=\"innerSidebar\">\n<a href=\"/Main Page\"><img src=\"/images/logo.png\" align=\"middle\"></a>\n<ul class=\"nav\">\n<li><a href=\"/factorial\">Factorial</a></li>\n<li><a href=\"/overflow\">Overflow</a></li>\n</ul>\n</div>\n</div>\n<div id=\"content\" class=\"content\">\n<div class=\"innerContent\">\n<h1>" + title.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) + "</h1><hr>";
                var html_tail = "\n</div>\n</div>\n</section>\n<footer class=\"container1\">\n<p>Copyright &copy; The Functional Wiki. All rights reserved.</p>\n</footer></body>\n</html>";
                try {
                    result = parser.parse(text, {title : title}).evaluate(Object.create(null));
                    //res.set('Content-Type', 'text/plain; encoding=utf-8'); // plain_text
                    //res.send(generators.plain_text(result.value)); // plain_text
                    res.write(html_head + generators.html_text(result.value) + html_tail); // html
                } catch (e) {
                    if (e.name === 'SyntaxError') {
                        e.toString = function () {
                            return 'Syntax Error:\n' + e.message + '\n\n' + 'at line ' + e.location.start.line + ' column ' + e.location.start.column;
                        }
                    }
                    console.log(e);
                    res.status(500);
                    //res.set('Content-Type', 'text/plain; encoding=utf-8'); // plain_text
                    //res.send(e.toString()); // plain_text
                    res.write(html_head + e.toString().replace(/\n/g, '<br>') + html_tail); // html  
                }
                res.end();
            }  
        } catch (err) {
            console.log(err);
            res.status(404);
            res.sendFile('404.html', {root : __dirname});
        }
    }
);

app.post (
    '/create'
    , function (req, res) {
        var success = 0;
        var type = req.body.t;
        var title = req.body.n;
        var content = req.body.c;

        if (type === "save") {
            fs.writeFile(__dirname + "/articles/" + title, content, function(err) {
                if(err) {
                    return console.log(err);
                }
                success = 1;
                console.log("The file was saved!");
            });
            if (success == 1) {
                res.end("done");
            } else {
                res.end("failed");
            }
        } else if (type === "load") {
            try {
                var data = fs.readFileSync('articles/' + title, 'utf8');
            } catch (e) {
                console.log(e);
            }
            res.end(data);
        } else {
            try {
                var result = parser.parse(req.body.c).evaluate(Object.create(null));
                res.send(generators.plain_text(result.value));
            } catch (e) {
                if (e.name === 'SyntaxError') {
                    e.toString = function () {
                        return 'Syntax Error:\n' + e.message + '\n\n' + 'at line ' + e.location.start.line + ' column ' + e.location.start.column;
                    }
                }
                console.log(e);
                res.send(e.toString());
            }
            res.end();
        }
    }
);

app.listen(
    8888
    , function () {
        console.log("App started");
    }
);
