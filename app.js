var express = require('express');
var fs = require('fs');
var parser = require('./parser');
var generators = require('./generators');

var app = express();

app.use("/css", express.static(__dirname + '/css'));
app.use("/images", express.static(__dirname + '/images'));

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
            var html_head = "<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\">\n<head>\n<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />\n<title>" + title + "</title>\n<link rel=\"stylesheet\" type=\"text/css\" href=\"/css/styles.css\">\n<script src=\"https://ajax.googleapis.com/ajax/libs/jquery/1.12.0/jquery.min.js\"></script>\n<script>$(document).ready(function(){var height_c = $(\".content\").height();var height_s = $(\".sidebar1\").height();if (height_c >= height_s) {$(\".sidebar1\").height(height_c)} else {$(\".content\").height(height_s)}});</script>\n</head>\n<body>\n<section class=\"container\">\n<div id=\"sidebar\" class=\"sidebar1\">\n<a href=\"http://localhost:8888/Main Page\"><img src=\"/images/logo.png\" align=\"middle\"></a>\n<ul>\n<li><a href=\"http://localhost:8888/factorial\">Factorial</a></li>\n<ul>\n</div>\n<div id=\"content\" class=\"content\">\n<div class=\"innerContent\">\n<h1>" + title.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) + "</h1><hr>";
            var html_tail = "\n</div>\n</div>\n</section>\n</body>\n</html>";
            try {
                result = parser.parse(text, {title : title}).evaluate(Object.create(null));
                //res.set('Content-Type', 'text/plain; encoding=utf-8'); // plain_text
                //res.send(generators.plain_text(result.value)); // plain_text
                res.write(html_head + generators.html_text(result.value) + html_tail); // html
            } catch (e) {
                console.log(e);
                res.status(500);
                //res.set('Content-Type', 'text/plain; encoding=utf-8'); // plain_text
                //res.send(e.toString()); // plain_text
                res.write(html_head + e.toString() + html_tail); // html
                
            }
            res.end();
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
