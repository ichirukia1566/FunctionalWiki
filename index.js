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
        if (e.name === "SyntaxError" || e.name === "InterpreterError") {
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
        } else {
            throw e;
        }
    }
}
