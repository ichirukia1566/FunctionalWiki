function run() {
    var ast = parser.parse(document.getElementById("code").value);
    var result = evaluate(ast, {});
    document.getElementById("output").value = result.value;
}
