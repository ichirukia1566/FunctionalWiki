var parser = require('./parser');
var interpreter = require('./interpreter');
var fs = require('fs');

var symbols = Object.create(null);
interpreter.load_std_lib(symbols);

var NotImplementedException = require('./interpreter').errors.NotImplementedException;

module.exports.plain_text = function plain_text_generator(value) {
    var type = value['@class'];
    if (type.compatibleWith(symbols['PlainText'][0])) {
        return value.content.join('');
    }
    var quote;
    if (type.compatibleWith(symbols['StrongText'][0])) {
        quote = '*';
    }
    if (type.compatibleWith(symbols['EmphasisedText'][0])) {
        quote = '/';
    }
    if (type.compatibleWith(symbols['StyledText'][0])) {
        quote = '';
    }
    if (type.compatibleWith(symbols['TableCell'][0])) {
        quote = '|';
    }
    if (type.compatibleWith(symbols['Heading'][0])) {
        quote = '='.repeat(value.level);
    }
    if (quote !== undefined) {
        return quote + plain_text_generator(value.content) + quote;
    }
    if (type.compatibleWith(symbols['Table'][0])) {
        return value.cells.map(
            function (row) {
                return row.map(
                    function (cell) {
                        return plain_text_generator(cell);
                    }
                ).join('\t');
            }
        ).join('\n');
    }
    if (type.compatibleWith(symbols['InternalLink'][0])) {
        return plain_text_generator(value.content) 
    }
    if (type.compatibleWith(symbols['ExternalLink'][0])) {
        return plain_text_generator(value.content) 
            + ' [' 
            + value.url.join('') 
            + ']';
    }
    if (type.compatibleWith(symbols['TextSequence'][0])) {
        return value.content.map(
            function (segment) {
                return plain_text_generator(segment);
            }
        ).join('');
    }
    throw new NotImplementedException("Rendering of " + type.name + " is not implemented");
};

module.exports.html_text = function html_text_generator(value) {
    var type = value['@class'];
    if (type.compatibleWith(symbols['PlainText'][0])) {
        return value.content.join('');
    }
    var start_tag;
    var end_tag;
    if (type.compatibleWith(symbols['StrongText'][0])) {
        start_tag = "<strong>";
        end_tag = "</strong>";
    }
    if (type.compatibleWith(symbols['EmphasisedText'][0])) {
        start_tag = "<em>";
        end_tag = "</em>";
    }
    if (type.compatibleWith(symbols['StyledText'][0])) {
        start_tag = '';
        end_tag = '';
    }
    if (type.compatibleWith(symbols['TableCell'][0])) {
        start_tag = '|';
        end_tag = '|';
    }
    if (type.compatibleWith(symbols['Heading'][0])) {
        if (value.level <= 6) {
            start_tag = "<h" + value.level + ">";
            end_tag = "</h" + value.level + "><hr>\n";
        } else {
            start_tag = "<h6>";
            end_tag = "</h6><hr>\n";
        }
        
    }
    if (start_tag !== undefined) {
        return start_tag + html_text_generator(value.content, symbols) + end_tag;
    }
    if (type.compatibleWith(symbols['Table'][0])) {
        return value.cells.map(
            function (row) {
                return row.map(
                    function (cell) {
                        return html_text_generator(cell, symbols);
                    }
                ).join('\t');
            }
        ).join('\n');
    }
    if (type.compatibleWith(symbols['TextSequence'][0])) {
        return value.content.map(
            function (segment) {
                return html_text_generator(segment, symbols);
            }
        ).join('');
    }
    throw new NotImplementedException("Rendering of " + type.name + " is not implemented");
};
