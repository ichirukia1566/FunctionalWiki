"use strict";

function run() {
    document.getElementById("output").value = ""; // clear the text area first
    try {
        var doc
            = parser.parse(document.getElementById("document").value, {startRule : "program", title : "document"});
        title = "std";
        var std 
            = parser.parse(document.getElementById("std").value, {startRule : "program", title : "std"});
        title = "input";
        var text
            = parser.parse(document.getElementById("code").value, {title : "input"});

        var symbols = Object.create(null);
        std.evaluate(symbols);
        doc.evaluate(symbols);
        var doc_symbols = copy_symbols(symbols);
        var result = text.evaluate(symbols);

        document.getElementById("output").value = plain_text_generator(result.value, doc_symbols);
    } catch (e) {
        if (e.name === "SyntaxError") {
            alert(
                e.name
                + ": \n"
                + e.message 
                + "\n"
                + "at line " 
                + e.location.start.line 
                + " column " 
                + e.location.start.column
            );
        } else if (e.name === "InterpreterError") {
            var message = 
                e.name
                + ": \n"
                + e.message 
                + "\n\n"
                + "Call stack:\n";
            e.call_stack.forEach(
                function (layer, index) {
                    message += "#" + index + ": file " + layer.title + " line " + layer.start.line + " column " + layer.start.column + "\n";
                }
            );
            alert(message);
        } else {
            throw e;
        }
    }
}
