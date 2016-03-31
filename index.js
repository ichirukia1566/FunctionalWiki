function run() {
    document.getElementById("output").value = ""; // clear the text area first
    try {
        var ast = parser.parse(document.getElementById("code").value);
        var result = ast.evaluate(Object.create(null));
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
