function run() {
    document.getElementById("output").value = ""; // clear the text area first
    try {
        var std = parser.parse(document.getElementById("std").value).declare(Object.create(null))
        var result = parser.parse(document.getElementById("code").value).evaluate(std);
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
