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
        return quote + plain_text_generator(value.content, symbols) + quote;
    }
    if (type.compatibleWith(symbols['Table'][0])) {
        return value.cells.map(
            function (row) {
                return row.map(
                    function (cell) {
                        return plain_text_generator(cell, symbols);
                    }
                ).join('\t');
            }
        ).join('\n');
    }
    if (type.compatibleWith(symbols['TextSequence'][0])) {
        return value.content.map(
            function (segment) {
                return plain_text_generator(segment, symbols);
            }
        ).join('');
    }
    throw new NotImplementedException("Rendering of " + type.name + " is not implemented");
};
