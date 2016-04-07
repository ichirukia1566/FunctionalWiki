function run() {
    document.getElementById("output").value = ""; // clear the text area first
    try {
        var std 
            = parser.parse(document.getElementById("std").value, {startRule : "program"});
        var symbols = Object.create(null);
        std.evaluate(symbols);
        var text
            = parser.parse(document.getElementById("code").value);
        var result = "";
        text.forEach(
            function (section) {
                if (section instanceof Expression) {
                    result += section.evaluate(symbols);
                } else {
                    result += section;
                }
            }
        );
         
        document.getElementById("output").value = result;
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
                    message += "#" + index + ": line " + layer.start.line + " column " + layer.start.column + "\n";
                }
            );
            alert(message);
        } else {
            throw e;
        }
    }
}
