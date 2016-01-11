function run() {
	document.getElementById("output").value = ""; // clear the text area first
    var ast = parser.parse(document.getElementById("code").value);
    var result = evaluate(ast, {});
    document.getElementById("output").value = result.value;
}
